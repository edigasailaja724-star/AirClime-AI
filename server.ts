import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import {
  ALLOWED_GEMINI_MODELS,
  MAX_GEMINI_RETRY_ATTEMPTS,
  buildModelCandidates,
  classifyGeminiError,
  computeBackoffDelayMs,
  defaultSleep,
  extractUpstreamStatus,
  generateWithRetryAndFallback,
  getGeminiClient,
  isPermanentNonRetryableError,
  isTransientGeminiError,
  parseRetryAfterMs,
  type AttemptErrorLog,
  type ChatTurn,
} from './server/geminiService';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

interface AtmosRequestBody {
  messages?: ChatTurn[];
  language?: 'en' | 'te' | 'hi';
  locationContext?: unknown;
  comparisonContext?: unknown;
}

const inFlightStandardRequests = new Map<
  string,
  Promise<{ reply: string; model: string; timestamp: string }>
>();
const activeStreamFingerprints = new Set<string>();

function isFiniteCoordinate(val: unknown, min: number, max: number): val is number {
  return typeof val === 'number' && Number.isFinite(val) && val >= min && val <= max;
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'AirClime API',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0),
    models: ALLOWED_GEMINI_MODELS,
    maxRetryAttempts: MAX_GEMINI_RETRY_ATTEMPTS,
    activeInFlightRequests: inFlightStandardRequests.size + activeStreamFingerprints.size,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/reverse-geocode', async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);

  if (!isFiniteCoordinate(lat, -90, 90) || !isFiniteCoordinate(lon, -180, 180)) {
    res.status(400).json({ error: 'Valid lat and lon query parameters are required.' });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', lat.toFixed(5));
    url.searchParams.set('lon', lon.toFixed(5));
    url.searchParams.set('zoom', '10');
    url.searchParams.set('addressdetails', '1');

    const upstream = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'AirClime-Environmental-Intelligence/1.0',
        Accept: 'application/json',
      },
    });

    if (!upstream.ok) {
      res.json({
        name: `${lat.toFixed(3)}, ${lon.toFixed(3)}`,
        admin1: '',
        country: 'Coordinates',
        latitude: lat,
        longitude: lon,
        source: 'Coordinates fallback',
      });
      return;
    }

    const data = (await upstream.json()) as {
      name?: string;
      display_name?: string;
      address?: Record<string, string>;
    };

    const addr = data.address ?? {};
    const cityName =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.county ||
      addr.state_district ||
      data.name ||
      `${lat.toFixed(3)}, ${lon.toFixed(3)}`;

    const admin1 = addr.state || addr.region || '';
    const country = addr.country || '';

    res.json({
      name: cityName,
      admin1,
      country,
      latitude: lat,
      longitude: lon,
      source: 'OpenStreetMap Nominatim',
    });
  } catch {
    res.json({
      name: `${lat.toFixed(3)}, ${lon.toFixed(3)}`,
      admin1: '',
      country: 'Coordinates',
      latitude: lat,
      longitude: lon,
      source: 'Coordinates fallback',
    });
  } finally {
    clearTimeout(timeout);
  }
});

app.get('/api/alerts', async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);

  if (!isFiniteCoordinate(lat, -90, 90) || !isFiniteCoordinate(lon, -180, 180)) {
    res.status(400).json({ error: 'Valid lat and lon query parameters are required.' });
    return;
  }

  // NWS active alerts apply to US coordinates (~lat 18..72, lon -179..-64)
  const isLikelyUS = lat >= 17.5 && lat <= 72 && lon >= -179.9 && lon <= -64.5;
  if (!isLikelyUS) {
    res.json({
      alerts: [],
      source: 'Open-Meteo WMO Advisory Engine',
      officialFeedAvailable: false,
    });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const nwsUrl = `https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`;
    const upstream = await fetch(nwsUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'AirClime-Environmental-Intelligence/1.0',
        Accept: 'application/geo+json',
      },
    });

    if (!upstream.ok) {
      res.json({
        alerts: [],
        source: 'Open-Meteo WMO Advisory Engine',
        officialFeedAvailable: false,
      });
      return;
    }

    const payload = (await upstream.json()) as {
      features?: Array<{
        id?: string;
        properties?: {
          event?: string;
          severity?: string;
          headline?: string;
          description?: string;
          instruction?: string;
          effective?: string;
          expires?: string;
          senderName?: string;
        };
      }>;
    };

    const alerts = (payload.features ?? []).slice(0, 8).map((feat) => {
      const p = feat.properties ?? {};
      const sevRaw = (p.severity || '').toLowerCase();
      const level =
        sevRaw === 'extreme' || sevRaw === 'severe'
          ? 'severe'
          : sevRaw === 'moderate'
            ? 'moderate'
            : 'advisory';
      return {
        id: feat.id || `${p.event || 'alert'}-${p.effective || Date.now()}`,
        title: p.event || 'Weather Alert',
        severity: level,
        headline: p.headline || p.event || 'Active weather alert',
        description: p.description || '',
        instruction: p.instruction || '',
        effective: p.effective || null,
        expires: p.expires || null,
        source: p.senderName || 'National Weather Service (NOAA)',
      };
    });

    res.json({
      alerts,
      source: 'National Weather Service (NOAA)',
      officialFeedAvailable: true,
    });
  } catch {
    res.json({
      alerts: [],
      source: 'Open-Meteo WMO Advisory Engine',
      officialFeedAvailable: false,
    });
  } finally {
    clearTimeout(timeout);
  }
});

function buildAirClimeSystemInstruction(
  language: 'en' | 'te' | 'hi',
  locationContext: unknown,
  comparisonContext: unknown,
): string {
  const languageLabel =
    language === 'te'
      ? 'Telugu (తెలుగు script, clear everyday Telugu with scientific units intact)'
      : language === 'hi'
        ? 'Hindi (हिन्दी Devanagari script, clear everyday Hindi with scientific units intact)'
        : 'English (clear, concise, scientifically accurate English)';

  const contextBlock = JSON.stringify({
    location: locationContext ?? null,
    comparison: comparisonContext ?? null,
  }).slice(0, 8000);

  return [
    'You are AirClime-ai – Your Environmental Intelligence Assistant on the AirClime platform.',
    `Always respond in ${languageLabel}.`,
    'Rules:',
    '1. Only cite AQI, pollutants (PM2.5, PM10, CO, NO2, SO2, O3), temperatures, wind speeds, alerts, and forecast numbers present in the Live Context JSON below. Never invent measurements.',
    '2. If a reading is null or absent, state clearly that it is currently unavailable.',
    '3. Distinguish US AQI (0-500) from European AQI (0-100+) when quoting AQI.',
    '4. Give general wellness guidance only, never medical diagnosis or treatment.',
    '5. Keep answers concise, direct, and easy to understand (usually 2–5 short sentences or crisp bullets) so users get fast, actionable replies.',
    '6. You can explain all 13 AirClime modules: Discover, Air Intelligence, Sunlight & Solar, Weather Intelligence, EarthScope, Snow & Storm Radar, AirClime-ai, LifeSync, AtmosCompare, EcoSmart, Daily Report, Alert Center, and Data Lab.',
    `Live Context JSON: ${contextBlock}`,
  ].join('\n');
}

function parseChatBody(body: AtmosRequestBody): {
  sanitizedMessages: ChatTurn[];
  language: 'en' | 'te' | 'hi';
  systemInstruction: string;
} {
  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  const language: 'en' | 'te' | 'hi' =
    body.language === 'te' || body.language === 'hi' ? body.language : 'en';

  const cleaned = rawMessages
    .filter(
      (m): m is ChatTurn =>
        Boolean(m) &&
        (m.role === 'user' || m.role === 'model') &&
        typeof m.content === 'string' &&
        m.content.trim().length > 0,
    )
    .slice(-14)
    .map((m) => ({
      role: m.role,
      content: m.content.trim().slice(0, 2000),
    }));

  // Ensure valid alternating user/model turns starting with a user message
  const sanitizedMessages: ChatTurn[] = [];
  for (const turn of cleaned) {
    if (sanitizedMessages.length === 0 && turn.role !== 'user') {
      continue;
    }
    const prev = sanitizedMessages[sanitizedMessages.length - 1];
    if (prev && prev.role === turn.role) {
      prev.content = `${prev.content}\n\n${turn.content}`.slice(0, 2500);
    } else {
      sanitizedMessages.push({ ...turn });
    }
  }

  const systemInstruction = buildAirClimeSystemInstruction(
    language,
    body.locationContext,
    body.comparisonContext,
  );

  return { sanitizedMessages, language, systemInstruction };
}

function buildRequestFingerprint(language: string, messages: ChatTurn[]): string {
  const lastTurn = messages[messages.length - 1]?.content ?? '';
  return `${language}:${messages.length}:${lastTurn.slice(0, 240)}`;
}

app.post('/api/airclime-ai/stream', async (req, res) => {
  const ai = getGeminiClient();
  if (!ai) {
    res.status(503).json({
      error:
        'AirClime-ai is currently unavailable because GEMINI_API_KEY is not configured on the server. All live AirClime modules continue working normally.',
      code: 'GEMINI_NOT_CONFIGURED',
      retryable: false,
    });
    return;
  }

  const { sanitizedMessages, language, systemInstruction } = parseChatBody(
    (req.body ?? {}) as AtmosRequestBody,
  );

  if (sanitizedMessages.length === 0) {
    res.status(400).json({
      error: 'Please enter a message before sending to AirClime-ai.',
      code: 'EMPTY_MESSAGE',
      retryable: false,
    });
    return;
  }

  const fingerprint = buildRequestFingerprint(language, sanitizedMessages);
  if (activeStreamFingerprints.has(fingerprint)) {
    res.status(429).json({
      error: 'Your previous AirClime-ai question is still being processed. Please wait for it to finish.',
      code: 'DUPLICATE_IN_FLIGHT',
      retryable: true,
    });
    return;
  }
  activeStreamFingerprints.add(fingerprint);

  const contents = sanitizedMessages.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.content }],
  }));

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  let clientClosed = false;
  res.on('close', () => {
    if (!res.writableEnded) {
      clientClosed = true;
    }
    activeStreamFingerprints.delete(fingerprint);
  });

  try {
    const candidates = buildModelCandidates(systemInstruction);
    let streamedAny = false;
    let lastError: unknown;
    const attemptErrors: AttemptErrorLog[] = [];

    for (const candidate of candidates) {
      if (clientClosed) return;
      let haltAllModels = false;

      for (let attempt = 0; attempt < MAX_GEMINI_RETRY_ATTEMPTS; attempt++) {
        if (clientClosed) return;
        try {
          const stream = await ai.models.generateContentStream({
            model: candidate.model,
            contents,
            config: candidate.config,
          });

          for await (const chunk of stream) {
            if (clientClosed) return;
            const delta = chunk.text;
            if (delta) {
              streamedAny = true;
              res.write(`data: ${JSON.stringify({ delta, model: candidate.model, language })}\n\n`);
            }
          }

          if (streamedAny) {
            res.write(`data: ${JSON.stringify({ done: true, timestamp: new Date().toISOString() })}\n\n`);
            res.end();
            return;
          }
          break;
        } catch (err: unknown) {
          lastError = err;
          const status = extractUpstreamStatus(err);
          const retryAfterMs = parseRetryAfterMs(err);
          attemptErrors.push({
            model: candidate.model,
            attempt: attempt + 1,
            status,
            retryAfterMs,
            reason: err instanceof Error ? err.message.slice(0, 180) : 'Unknown error',
          });
          if (streamedAny) break;

          if (isPermanentNonRetryableError(err)) {
            if (status === 401 || status === 403 || status === 400) {
              haltAllModels = true;
            }
            break;
          }

          if (attempt + 1 < MAX_GEMINI_RETRY_ATTEMPTS && isTransientGeminiError(err)) {
            const delayMs = computeBackoffDelayMs(attempt, retryAfterMs);
            await defaultSleep(delayMs);
            continue;
          }
          break;
        }
      }
      if (streamedAny || haltAllModels) break;
    }

    if (clientClosed) return;
    console.error('[AirClime-ai] Stream attempts failed:', JSON.stringify(attemptErrors));
    const classified = classifyGeminiError(lastError ?? new Error('Empty stream response'));
    res.write(
      `data: ${JSON.stringify({
        error: classified.userMessage,
        code: classified.code,
        retryable: classified.retryable,
      })}\n\n`,
    );
    res.end();
  } finally {
    activeStreamFingerprints.delete(fingerprint);
  }
});

const handleStandardAirClimeAi = async (req: express.Request, res: express.Response) => {
  const ai = getGeminiClient();
  if (!ai) {
    res.status(503).json({
      error:
        'AirClime-ai is currently unavailable because GEMINI_API_KEY is not configured on the server. All live AirClime modules continue working normally.',
      code: 'GEMINI_NOT_CONFIGURED',
      retryable: false,
    });
    return;
  }

  const { sanitizedMessages, language, systemInstruction } = parseChatBody(
    (req.body ?? {}) as AtmosRequestBody,
  );

  if (sanitizedMessages.length === 0) {
    res.status(400).json({
      error: 'Please enter a message before sending to AirClime-ai.',
      code: 'EMPTY_MESSAGE',
      retryable: false,
    });
    return;
  }

  const fingerprint = buildRequestFingerprint(language, sanitizedMessages);
  const existingInFlight = inFlightStandardRequests.get(fingerprint);
  if (existingInFlight) {
    try {
      const coalesced = await existingInFlight;
      res.json(coalesced);
      return;
    } catch (err: unknown) {
      const classified = classifyGeminiError(err);
      res.status(classified.status).json({
        error: classified.userMessage,
        code: classified.code,
        retryable: classified.retryable,
      });
      return;
    }
  }

  const contents = sanitizedMessages.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.content }],
  }));

  const candidates = buildModelCandidates(systemInstruction);

  const work = (async () => {
    const result = await generateWithRetryAndFallback({
      candidates,
      maxAttemptsPerModel: MAX_GEMINI_RETRY_ATTEMPTS,
      invoke: async (candidate) => {
        const response = await ai.models.generateContent({
          model: candidate.model,
          contents,
          config: candidate.config,
        });
        return response.text?.trim() ?? '';
      },
    });
    return {
      reply: result.reply,
      model: result.model,
      language,
      timestamp: new Date().toISOString(),
    };
  })();

  inFlightStandardRequests.set(fingerprint, work);

  try {
    const payload = await work;
    res.json(payload);
  } catch (err: unknown) {
    const classified = classifyGeminiError(err);
    res.status(classified.status).json({
      error: classified.userMessage,
      code: classified.code,
      retryable: classified.retryable,
    });
  } finally {
    inFlightStandardRequests.delete(fingerprint);
  }
};

app.post('/api/airclime-ai', handleStandardAirClimeAi);
app.post('/api/atmos-ai', handleStandardAirClimeAi);

async function startServer() {
  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AirClime server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start AirClime server:', err);
  process.exit(1);
});
