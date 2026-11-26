import { GoogleGenAI, ThinkingLevel } from '@google/genai';

export const ALLOWED_GEMINI_MODELS = [
  'gemini-4-hydrogen',
  'gemini-3.1-flash-lite',
] as const;

export type AllowedGeminiModel = (typeof ALLOWED_GEMINI_MODELS)[number];

export const MAX_GEMINI_RETRY_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 700;
const MAX_JITTER_MS = 350;
const MAX_RETRY_AFTER_WAIT_MS = 8000;

export interface ChatTurn {
  role: 'user' | 'model';
  content: string;
}

export interface ModelAttempt {
  model: AllowedGeminiModel;
  config: Record<string, unknown>;
}

export interface AttemptErrorLog {
  model: string;
  attempt: number;
  status?: number;
  retryAfterMs?: number;
  reason: string;
}

export interface ClassifiedGeminiError {
  status: number;
  code: string;
  retryable: boolean;
  upstreamStatus?: number;
  userMessage: string;
}

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: 20000,
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function buildModelCandidates(systemInstruction: string): ModelAttempt[] {
  const envFallback = process.env.GEMINI_FALLBACK_MODEL?.trim() as
    | AllowedGeminiModel
    | undefined;

  const orderedModels: AllowedGeminiModel[] = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
  if (
    envFallback &&
    (ALLOWED_GEMINI_MODELS as readonly string[]).includes(envFallback) &&
    !orderedModels.includes(envFallback)
  ) {
    orderedModels.push(envFallback);
  }

  return orderedModels.map((model) =>
    model === 'gemini-3.1-flash-lite'
      ? {
          model,
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          },
        }
      : {
          model,
          config: { systemInstruction },
        },
  );
}

export function extractUpstreamStatus(err: unknown): number | undefined {
  const record = err as { status?: unknown; statusCode?: unknown; code?: unknown } | undefined;
  if (typeof record?.status === 'number') return record.status;
  if (typeof record?.statusCode === 'number') return record.statusCode;

  const msg = err instanceof Error ? err.message : String(err ?? '');
  if (msg.includes('"code":429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes(' 429 ')) return 429;
  if (msg.includes('"code":503') || msg.includes('UNAVAILABLE') || msg.includes(' 503 ')) return 503;
  if (msg.includes('"code":500') || msg.includes('INTERNAL')) return 500;
  if (msg.includes('"code":401') || msg.includes('UNAUTHENTICATED')) return 401;
  if (msg.includes('"code":403') || msg.includes('PERMISSION_DENIED')) return 403;
  if (msg.includes('"code":404') || msg.includes('NOT_FOUND')) return 404;
  if (msg.includes('"code":400') || msg.includes('INVALID_ARGUMENT') || msg.includes('API_KEY_INVALID')) return 400;
  return undefined;
}

export function parseRetryAfterMs(err: unknown, nowMs = Date.now()): number | undefined {
  const record = err as {
    retryAfter?: unknown;
    headers?: { get?: (k: string) => string | null; [key: string]: unknown };
    response?: { headers?: { get?: (k: string) => string | null; [key: string]: unknown } };
  };

  let rawHeader: string | undefined;

  if (typeof record?.retryAfter === 'number' && Number.isFinite(record.retryAfter)) {
    return Math.min(MAX_RETRY_AFTER_WAIT_MS, Math.max(0, record.retryAfter * 1000));
  }
  if (typeof record?.retryAfter === 'string') {
    rawHeader = record.retryAfter;
  }

  const headerSources = [record?.headers, record?.response?.headers];
  for (const h of headerSources) {
    if (!h) continue;
    if (typeof h.get === 'function') {
      const val = h.get('retry-after') || h.get('Retry-After');
      if (val) {
        rawHeader = val;
        break;
      }
    } else {
      const val = h['retry-after'] ?? h['Retry-After'];
      if (typeof val === 'string' && val.trim()) {
        rawHeader = val;
        break;
      }
    }
  }

  if (rawHeader) {
    const trimmed = rawHeader.trim();
    const numericSeconds = Number(trimmed);
    if (Number.isFinite(numericSeconds) && numericSeconds >= 0) {
      return Math.min(MAX_RETRY_AFTER_WAIT_MS, Math.round(numericSeconds * 1000));
    }
    const parsedDate = Date.parse(trimmed);
    if (Number.isFinite(parsedDate)) {
      return Math.min(MAX_RETRY_AFTER_WAIT_MS, Math.max(0, parsedDate - nowMs));
    }
  }

  // Also inspect Google JSON retryDelay metadata (e.g. "retryDelay":"4s")
  const msg = err instanceof Error ? err.message : '';
  const match = msg.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
  if (match) {
    const secs = Number(match[1]);
    if (Number.isFinite(secs) && secs >= 0) {
      return Math.min(MAX_RETRY_AFTER_WAIT_MS, Math.round(secs * 1000));
    }
  }

  return undefined;
}

export function isPermanentNonRetryableError(err: unknown): boolean {
  const status = extractUpstreamStatus(err);
  if (status === 400 || status === 401 || status === 403 || status === 404) {
    return true;
  }
  const msg = err instanceof Error ? err.message : '';
  return (
    msg.includes('API_KEY_INVALID') ||
    msg.includes('API key not valid') ||
    msg.includes('PERMISSION_DENIED') ||
    msg.includes('INVALID_ARGUMENT') ||
    msg.includes('NOT_FOUND')
  );
}

export function isTransientGeminiError(err: unknown): boolean {
  if (isPermanentNonRetryableError(err)) {
    return false;
  }
  const status = extractUpstreamStatus(err);
  const msg = err instanceof Error ? err.message : '';
  return (
    status === 429 ||
    status === 503 ||
    status === 500 ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('ECONNRESET') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('fetch failed') ||
    msg.toLowerCase().includes('timeout')
  );
}

export function computeBackoffDelayMs(
  attemptIndex: number,
  retryAfterMs?: number,
  randomFn: () => number = Math.random,
): number {
  const exponential = BASE_BACKOFF_MS * Math.pow(2, attemptIndex);
  const jitter = Math.round(Math.max(0, Math.min(1, randomFn())) * MAX_JITTER_MS);
  const computed = exponential + jitter;
  if (typeof retryAfterMs === 'number' && Number.isFinite(retryAfterMs) && retryAfterMs > 0) {
    return Math.min(MAX_RETRY_AFTER_WAIT_MS, Math.max(computed, retryAfterMs));
  }
  return Math.min(MAX_RETRY_AFTER_WAIT_MS, computed);
}

export function classifyGeminiError(err: unknown): ClassifiedGeminiError {
  const message = err instanceof Error ? err.message : 'Unknown upstream AI error';
  const upstreamStatus = extractUpstreamStatus(err);

  if (
    upstreamStatus === 401 ||
    upstreamStatus === 403 ||
    message.includes('PERMISSION_DENIED') ||
    message.includes('API_KEY_INVALID') ||
    message.includes('API key not valid') ||
    message.includes('API key')
  ) {
    return {
      status: 503,
      code: 'GEMINI_KEY_INVALID',
      retryable: false,
      upstreamStatus,
      userMessage:
        'AirClime-ai could not authenticate with the Gemini API. Please check your GEMINI_API_KEY configuration in Settings > Secrets. All other AirClime modules remain active.',
    };
  }

  if (upstreamStatus === 400 || upstreamStatus === 404) {
    return {
      status: upstreamStatus,
      code: upstreamStatus === 404 ? 'GEMINI_MODEL_NOT_FOUND' : 'GEMINI_BAD_REQUEST',
      retryable: false,
      upstreamStatus,
      userMessage:
        'AirClime-ai encountered a configuration or request validation error with Gemini. All other AirClime modules remain active.',
    };
  }

  if (
    upstreamStatus === 429 ||
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('exceeded your current quota')
  ) {
    return {
      status: 429,
      code: 'GEMINI_QUOTA_OR_RATE_LIMIT',
      retryable: true,
      upstreamStatus,
      userMessage:
        'AirClime-ai is temporarily unavailable because the Gemini API key has exceeded its current quota or rate limit (429). Check your quota in Settings > Secrets or click Retry shortly.',
    };
  }

  if (
    upstreamStatus === 503 ||
    message.includes('UNAVAILABLE') ||
    message.includes('high demand')
  ) {
    return {
      status: 503,
      code: 'GEMINI_HIGH_DEMAND',
      retryable: true,
      upstreamStatus,
      userMessage:
        'AirClime-ai could not reach Gemini right now due to temporary high upstream demand (503). Retried automatically; please wait a moment and click Retry.',
    };
  }

  if (message.toLowerCase().includes('timeout') || message.toLowerCase().includes('abort')) {
    return {
      status: 504,
      code: 'GEMINI_TIMEOUT',
      retryable: true,
      upstreamStatus,
      userMessage:
        'AirClime-ai timed out waiting for Gemini to respond. Please click Retry to send your question again.',
    };
  }

  return {
    status: 502,
    code: 'GEMINI_UPSTREAM_UNAVAILABLE',
    retryable: true,
    upstreamStatus,
    userMessage:
      'AirClime-ai could not reach the Gemini service right now. Please click Retry in a moment; all other AirClime live modules remain active.',
  };
}

export function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateWithRetryAndFallback(params: {
  candidates: ModelAttempt[];
  invoke: (candidate: ModelAttempt) => Promise<string>;
  maxAttemptsPerModel?: number;
  sleepFn?: (ms: number) => Promise<void>;
  randomFn?: () => number;
}): Promise<{ reply: string; model: AllowedGeminiModel; attempts: number }> {
  const {
    candidates,
    invoke,
    maxAttemptsPerModel = MAX_GEMINI_RETRY_ATTEMPTS,
    sleepFn = defaultSleep,
    randomFn = Math.random,
  } = params;

  let lastError: unknown;
  let totalAttempts = 0;
  const attemptErrors: AttemptErrorLog[] = [];

  for (const candidate of candidates) {
    for (let attempt = 0; attempt < maxAttemptsPerModel; attempt++) {
      totalAttempts++;
      try {
        const reply = (await invoke(candidate)).trim();
        if (reply) {
          return { reply, model: candidate.model, attempts: totalAttempts };
        }
        lastError = new Error(`Empty response from ${candidate.model}`);
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

        if (isPermanentNonRetryableError(err)) {
          // Permanent auth/validation error on key or payload — do not retry endlessly
          if (status === 401 || status === 403 || status === 400) {
            throw Object.assign(err instanceof Error ? err : new Error(String(err)), {
              attemptErrors,
            });
          }
          break;
        }

        if (attempt + 1 < maxAttemptsPerModel && isTransientGeminiError(err)) {
          const delayMs = computeBackoffDelayMs(attempt, retryAfterMs, randomFn);
          await sleepFn(delayMs);
          continue;
        }
        break;
      }
    }
  }

  console.error('[AirClime-ai] Exhausted retry attempts:', JSON.stringify(attemptErrors));
  throw Object.assign(
    lastError instanceof Error ? lastError : new Error('All Gemini attempts failed'),
    { attemptErrors },
  );
}
