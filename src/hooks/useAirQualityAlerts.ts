import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AirQualityAlertRecord,
  AirQualityData,
  AqiStandard,
  LocationInfo,
  NotificationPermissionState,
} from '../types/environment';
import {
  AQI_STANDARD_OPTIONS,
  buildAirQualityAlertPayload,
  evaluateAirQualityForAlerts,
  shouldTriggerAirQualityAlert,
  type PreviousAlertSnapshot,
} from '../utils/airQuality';

const STORAGE_KEY = 'airclime_aq_alert_prefs_v1';

interface StoredAlertPrefs {
  enabled: boolean;
  standard: AqiStandard;
  threshold: number;
}

function getDefaultThreshold(standard: AqiStandard): number {
  return AQI_STANDARD_OPTIONS.find((s) => s.id === standard)?.defaultThreshold ?? 101;
}

function loadPrefs(): StoredAlertPrefs {
  const fallback: StoredAlertPrefs = {
    enabled: false,
    standard: 'us_aqi',
    threshold: getDefaultThreshold('us_aqi'),
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<StoredAlertPrefs>;
    const standard: AqiStandard = parsed.standard === 'european_aqi' ? 'european_aqi' : 'us_aqi';
    const validThresholds =
      AQI_STANDARD_OPTIONS.find((s) => s.id === standard)?.thresholds.map((t) => t.value) ?? [];
    const threshold =
      typeof parsed.threshold === 'number' && validThresholds.includes(parsed.threshold)
        ? parsed.threshold
        : getDefaultThreshold(standard);

    return {
      enabled: Boolean(parsed.enabled),
      standard,
      threshold,
    };
  } catch {
    return fallback;
  }
}

function readNotificationPermission(): NotificationPermissionState {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionState;
}

export function useAirQualityAlerts(
  location: LocationInfo,
  airQuality: AirQualityData | null,
) {
  const [prefs, setPrefs] = useState<StoredAlertPrefs>(() => loadPrefs());
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermissionState>(
    () => readNotificationPermission(),
  );
  const [activeBanner, setActiveBanner] = useState<AirQualityAlertRecord | null>(null);
  const [sessionAlerts, setSessionAlerts] = useState<AirQualityAlertRecord[]>([]);

  const lastAlertStateRef = useRef<PreviousAlertSnapshot | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // ignore storage quota errors
    }
  }, [prefs]);

  // Keep permission state fresh if user toggles browser site settings while tab is open
  useEffect(() => {
    const syncPermission = () => {
      setNotificationPermission(readNotificationPermission());
    };
    window.addEventListener('focus', syncPermission);
    return () => window.removeEventListener('focus', syncPermission);
  }, []);

  const evaluation = useMemo(
    () => evaluateAirQualityForAlerts(airQuality?.current, prefs.standard),
    [airQuality?.current, prefs.standard],
  );

  const isThresholdBreached =
    evaluation.value != null && evaluation.value >= prefs.threshold;

  const enableAlerts = useCallback(async () => {
    let nextPerm: NotificationPermissionState = readNotificationPermission();
    if (nextPerm === 'default' && typeof Notification !== 'undefined') {
      try {
        const result = await Notification.requestPermission();
        nextPerm = result as NotificationPermissionState;
      } catch {
        nextPerm = readNotificationPermission();
      }
    }
    setNotificationPermission(nextPerm);
    lastAlertStateRef.current = null;
    setPrefs((prev) => ({ ...prev, enabled: true }));
  }, []);

  const disableAlerts = useCallback(() => {
    lastAlertStateRef.current = null;
    setActiveBanner(null);
    setPrefs((prev) => ({ ...prev, enabled: false }));
  }, []);

  const changeStandard = useCallback((standard: AqiStandard) => {
    lastAlertStateRef.current = null;
    setPrefs((prev) => ({
      ...prev,
      standard,
      threshold: getDefaultThreshold(standard),
    }));
  }, []);

  const changeThreshold = useCallback((threshold: number) => {
    lastAlertStateRef.current = null;
    setPrefs((prev) => ({ ...prev, threshold }));
  }, []);

  const dismissBanner = useCallback(() => {
    setActiveBanner(null);
  }, []);

  const clearSessionAlerts = useCallback(() => {
    setSessionAlerts([]);
  }, []);

  // Evaluate live air quality readings whenever telemetry, location, or alert preferences change
  useEffect(() => {
    const locationKey = `${location.latitude.toFixed(2)},${location.longitude.toFixed(2)}`;

    if (!prefs.enabled) {
      return;
    }

    if (evaluation.value != null && evaluation.value < prefs.threshold) {
      // Clear active breach tracking once air returns below configured threshold
      if (
        lastAlertStateRef.current &&
        lastAlertStateRef.current.locationKey === locationKey &&
        lastAlertStateRef.current.standard === prefs.standard
      ) {
        lastAlertStateRef.current = null;
      }
      setActiveBanner((curr) => (curr && curr.locationName === location.name ? null : curr));
      return;
    }

    const decision = shouldTriggerAirQualityAlert({
      enabled: prefs.enabled,
      locationKey,
      evaluation,
      threshold: prefs.threshold,
      previous: lastAlertStateRef.current,
    });

    if (!decision.trigger || evaluation.value == null) {
      return;
    }

    const currentPerm = readNotificationPermission();
    setNotificationPermission(currentPerm);

    const areaParts = [location.name, location.admin1, location.country].filter(Boolean);
    const areaLabel = areaParts.slice(0, 2).join(', ') || location.name;
    const canUseBrowserNotification =
      currentPerm === 'granted' && typeof Notification !== 'undefined';

    const record = buildAirQualityAlertPayload({
      areaLabel,
      locationName: location.name,
      current: airQuality?.current,
      evaluation,
      deliveredVia: canUseBrowserNotification ? 'browser-notification' : 'in-app-banner',
    });

    if (!record) return;

    lastAlertStateRef.current = {
      locationKey,
      standard: prefs.standard,
      aqiValue: evaluation.value,
      severityRank: evaluation.severityRank,
    };

    if (canUseBrowserNotification) {
      try {
        new Notification(record.title, {
          body: `${record.message} Main pollutant: ${record.mainPollutant}.`,
          icon: '/assets/airclime-circle.png',
          tag: `airclime-aqi-${locationKey}-${prefs.standard}`,
          requireInteraction: evaluation.isHigherSeverity,
        });
      } catch {
        // Browser blocked constructor (e.g., restricted iframe); in-app banner still activates below
        record.deliveredVia = 'in-app-banner';
      }
    }

    setActiveBanner(record);
    setSessionAlerts((prev) => [record, ...prev].slice(0, 25));
  }, [
    airQuality?.current,
    evaluation,
    location.admin1,
    location.country,
    location.latitude,
    location.longitude,
    location.name,
    prefs.enabled,
    prefs.standard,
    prefs.threshold,
  ]);

  return {
    alertsEnabled: prefs.enabled,
    standard: prefs.standard,
    threshold: prefs.threshold,
    notificationPermission,
    evaluation,
    isThresholdBreached,
    activeBanner,
    sessionAlerts,
    enableAlerts,
    disableAlerts,
    changeStandard,
    changeThreshold,
    dismissBanner,
    clearSessionAlerts,
  };
}
