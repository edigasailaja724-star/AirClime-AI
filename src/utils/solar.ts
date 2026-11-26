export interface SolarPosition {
  elevationDeg: number;
  azimuthDeg: number;
  azimuthCardinal: string;
  declinationDeg: number;
  isDaylight: boolean;
}

export interface DaylightTimelineInfo {
  sunriseMs: number | null;
  sunsetMs: number | null;
  solarNoonMs: number | null;
  dayLengthMinutes: number | null;
  remainingDaylightMinutes: number | null;
  progressPercent: number;
  morningGoldenHour: string;
  eveningGoldenHour: string;
  morningBlueHour: string;
  eveningBlueHour: string;
  solarNoonLabel: string;
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

function getDayOfYear(date: Date): number {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

/**
 * NOAA / Spencer astronomical solar position formula.
 * Computes solar elevation & azimuth angles for any timestamp and coordinates.
 */
export function calculateSolarPosition(date: Date, lat: number, lon: number): SolarPosition {
  const doy = getDayOfYear(date);
  const utcHours =
    date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;

  // Fractional year in radians
  const gamma = ((2 * Math.PI) / 365) * (doy - 1 + (utcHours - 12) / 24);

  // Equation of time (minutes)
  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));

  // Solar declination (radians)
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  const trueSolarTimeMin = ((utcHours * 60 + eqTime + 4 * lon) % 1440 + 1440) % 1440;
  let hourAngleDeg = trueSolarTimeMin / 4 - 180;
  if (hourAngleDeg < -180) hourAngleDeg += 360;

  const latRad = degToRad(lat);
  const haRad = degToRad(hourAngleDeg);

  const cosZenith =
    Math.sin(latRad) * Math.sin(decl) +
    Math.cos(latRad) * Math.cos(decl) * Math.cos(haRad);
  const clampedCosZenith = Math.min(1, Math.max(-1, cosZenith));
  const zenithRad = Math.acos(clampedCosZenith);
  const elevationDeg = 90 - radToDeg(zenithRad);

  let azimuthDeg = 0;
  const sinZenith = Math.sin(zenithRad);
  if (Math.abs(sinZenith) > 1e-5) {
    const azCos =
      (Math.sin(latRad) * Math.cos(zenithRad) - Math.sin(decl)) /
      (Math.cos(latRad) * sinZenith);
    const clampedAzCos = Math.min(1, Math.max(-1, azCos));
    azimuthDeg = radToDeg(Math.acos(clampedAzCos));
    if (hourAngleDeg > 0) {
      azimuthDeg = (azimuthDeg + 180) % 360;
    } else {
      azimuthDeg = (540 - azimuthDeg) % 360;
    }
  }

  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const azimuthCardinal = dirs[Math.round(azimuthDeg / 45) % 8];

  return {
    elevationDeg: Number(elevationDeg.toFixed(1)),
    azimuthDeg: Number(azimuthDeg.toFixed(1)),
    azimuthCardinal,
    declinationDeg: Number(radToDeg(decl).toFixed(2)),
    isDaylight: elevationDeg > -0.833,
  };
}

function formatTimeFromMs(ms: number, timezone?: string): string {
  try {
    return new Intl.DateTimeFormat([], {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone || undefined,
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

export function calculateDaylightTimeline(
  sunriseIso: string | undefined,
  sunsetIso: string | undefined,
  daylightDurationSec: number | null | undefined,
  timezone?: string,
  nowMs = Date.now(),
): DaylightTimelineInfo {
  const sunriseMs = sunriseIso ? Date.parse(sunriseIso) : null;
  const sunsetMs = sunsetIso ? Date.parse(sunsetIso) : null;

  if (sunriseMs == null || sunsetMs == null || !Number.isFinite(sunriseMs) || !Number.isFinite(sunsetMs)) {
    return {
      sunriseMs: null,
      sunsetMs: null,
      solarNoonMs: null,
      dayLengthMinutes: daylightDurationSec != null ? Math.round(daylightDurationSec / 60) : null,
      remainingDaylightMinutes: null,
      progressPercent: 0,
      morningGoldenHour: 'Unavailable',
      eveningGoldenHour: 'Unavailable',
      morningBlueHour: 'Unavailable',
      eveningBlueHour: 'Unavailable',
      solarNoonLabel: 'Unavailable',
    };
  }

  const solarNoonMs = Math.round((sunriseMs + sunsetMs) / 2);
  const dayLengthMinutes =
    daylightDurationSec != null
      ? Math.round(daylightDurationSec / 60)
      : Math.max(0, Math.round((sunsetMs - sunriseMs) / 60000));

  const remainingDaylightMinutes =
    nowMs < sunriseMs
      ? dayLengthMinutes
      : nowMs > sunsetMs
        ? 0
        : Math.max(0, Math.round((sunsetMs - nowMs) / 60000));

  const progressPercent =
    nowMs <= sunriseMs
      ? 0
      : nowMs >= sunsetMs
        ? 100
        : Math.round(((nowMs - sunriseMs) / (sunsetMs - sunriseMs)) * 100);

  // Golden hour (~45 min after sunrise / before sunset), Blue hour (~25 min before sunrise / after sunset)
  const goldenSpanMs = 45 * 60 * 1000;
  const blueSpanMs = 25 * 60 * 1000;

  return {
    sunriseMs,
    sunsetMs,
    solarNoonMs,
    dayLengthMinutes,
    remainingDaylightMinutes,
    progressPercent,
    morningGoldenHour: `${formatTimeFromMs(sunriseMs, timezone)} – ${formatTimeFromMs(sunriseMs + goldenSpanMs, timezone)}`,
    eveningGoldenHour: `${formatTimeFromMs(sunsetMs - goldenSpanMs, timezone)} – ${formatTimeFromMs(sunsetMs, timezone)}`,
    morningBlueHour: `${formatTimeFromMs(sunriseMs - blueSpanMs, timezone)} – ${formatTimeFromMs(sunriseMs, timezone)}`,
    eveningBlueHour: `${formatTimeFromMs(sunsetMs, timezone)} – ${formatTimeFromMs(sunsetMs + blueSpanMs, timezone)}`,
    solarNoonLabel: formatTimeFromMs(solarNoonMs, timezone),
  };
}

export function formatMinutesAsHm(totalMinutes: number | null): string {
  if (totalMinutes == null || !Number.isFinite(totalMinutes)) return 'N/A';
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

/**
 * Estimates astronomical day length in minutes for any date & latitude (sunrise equation).
 */
export function estimateAstronomicalDayLengthMinutes(dateStr: string, latitude: number): number | null {
  const parsed = new Date(`${dateStr}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  const doy = getDayOfYear(parsed);
  const decl = degToRad(23.44) * Math.sin(((2 * Math.PI) / 365) * (doy - 81));
  const latRad = degToRad(Math.max(-89.5, Math.min(89.5, latitude)));
  const cosHa = -Math.tan(latRad) * Math.tan(decl);
  if (cosHa <= -1) return 1440; // polar day
  if (cosHa >= 1) return 0; // polar night
  const haDeg = radToDeg(Math.acos(cosHa));
  return Math.round((2 * haDeg) / 15 * 60);
}
