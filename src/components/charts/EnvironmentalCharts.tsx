import { useMemo } from 'react';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import type {
  AirQualityCurrent,
  AirQualityHourly,
  ComparisonSnapshot,
  ThemeMode,
  UnitSystem,
  WeatherDaily,
  WeatherHourly,
} from '../../types/environment';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend,
);

function getThemeColors(theme: ThemeMode) {
  return {
    text: theme === 'dark' ? '#94A3B8' : '#475569',
    grid: theme === 'dark' ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.06)',
    tooltipBg: theme === 'dark' ? '#131C21' : '#0F172A',
  };
}

export function HourlyAqiChart({
  hourly,
  metric,
  theme,
}: {
  hourly: AirQualityHourly;
  metric: 'us_aqi' | 'european_aqi' | 'pm2_5' | 'pm10';
  theme: ThemeMode;
}) {
  const palette = getThemeColors(theme);

  const { labels, values } = useMemo(() => {
    const now = Date.now();
    let startIdx = hourly.time.findIndex((t) => Date.parse(t) >= now - 3600 * 1000);
    if (startIdx < 0) startIdx = 0;
    const endIdx = Math.min(hourly.time.length, startIdx + 24);
    const lbls: string[] = [];
    const vals: Array<number | null> = [];
    for (let i = startIdx; i < endIdx; i++) {
      const d = new Date(hourly.time[i]);
      lbls.push(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      vals.push(hourly[metric][i] ?? null);
    }
    return { labels: lbls, values: vals };
  }, [hourly, metric]);

  const metricLabel =
    metric === 'us_aqi'
      ? 'US AQI (0–500)'
      : metric === 'european_aqi'
        ? 'European AQI (0–100+)'
        : metric === 'pm2_5'
          ? 'PM2.5 (µg/m³)'
          : 'PM10 (µg/m³)';

  const data = {
    labels,
    datasets: [
      {
        label: metricLabel,
        data: values,
        borderColor: '#059669',
        backgroundColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.16)' : 'rgba(5, 150, 105, 0.12)',
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 5,
        tension: 0.35,
        fill: true,
        spanGaps: true,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: palette.tooltipBg, padding: 10, cornerRadius: 8 },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: palette.text, maxTicksLimit: 8, font: { size: 11 } } },
      y: { beginAtZero: true, grid: { color: palette.grid }, ticks: { color: palette.text, font: { size: 11 } } },
    },
  };

  return (
    <div className="h-64 w-full">
      <Line data={data} options={options} />
    </div>
  );
}

export function MultiDayAqiTrendChart({
  hourly,
  theme,
}: {
  hourly: AirQualityHourly;
  theme: ThemeMode;
}) {
  const palette = getThemeColors(theme);

  const { labels, avgValues, maxValues } = useMemo(() => {
    const grouped = new Map<string, number[]>();
    hourly.time.forEach((iso, idx) => {
      const day = iso.slice(0, 10);
      const val = hourly.us_aqi[idx];
      if (val != null) {
        if (!grouped.has(day)) grouped.set(day, []);
        grouped.get(day)!.push(val);
      }
    });
    const entries = Array.from(grouped.entries()).slice(0, 7);
    return {
      labels: entries.map(([d]) =>
        new Date(`${d}T12:00:00`).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
      ),
      avgValues: entries.map(([, arr]) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)),
      maxValues: entries.map(([, arr]) => Math.round(Math.max(...arr))),
    };
  }, [hourly]);

  const data = {
    labels,
    datasets: [
      {
        label: 'Daily Avg US AQI',
        data: avgValues,
        borderColor: '#059669',
        backgroundColor: 'rgba(5, 150, 105, 0.14)',
        borderWidth: 2,
        tension: 0.3,
        fill: true,
      },
      {
        label: 'Daily Peak US AQI',
        data: maxValues,
        borderColor: '#D97706',
        borderDash: [4, 4],
        borderWidth: 2,
        tension: 0.3,
        fill: false,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: palette.text, boxWidth: 12, font: { size: 11 } } },
      tooltip: { backgroundColor: palette.tooltipBg, padding: 10, cornerRadius: 8 },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: palette.text, font: { size: 11 } } },
      y: { beginAtZero: true, grid: { color: palette.grid }, ticks: { color: palette.text, font: { size: 11 } } },
    },
  };

  return (
    <div className="h-64 w-full">
      <Line data={data} options={options} />
    </div>
  );
}

export function Pm25VsPm10Chart({
  hourly,
  theme,
}: {
  hourly: AirQualityHourly;
  theme: ThemeMode;
}) {
  const palette = getThemeColors(theme);

  const { labels, pm25, pm10 } = useMemo(() => {
    const now = Date.now();
    let startIdx = hourly.time.findIndex((t) => Date.parse(t) >= now - 3600 * 1000);
    if (startIdx < 0) startIdx = 0;
    const endIdx = Math.min(hourly.time.length, startIdx + 24);
    const lbls: string[] = [];
    const p25: Array<number | null> = [];
    const p10: Array<number | null> = [];
    for (let i = startIdx; i < endIdx; i++) {
      lbls.push(new Date(hourly.time[i]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      p25.push(hourly.pm2_5[i] ?? null);
      p10.push(hourly.pm10[i] ?? null);
    }
    return { labels: lbls, pm25: p25, pm10: p10 };
  }, [hourly]);

  const data = {
    labels,
    datasets: [
      {
        label: 'PM2.5 (µg/m³)',
        data: pm25,
        borderColor: '#0F5132',
        backgroundColor: 'rgba(15, 81, 50, 0.15)',
        borderWidth: 2,
        tension: 0.35,
        fill: true,
      },
      {
        label: 'PM10 (µg/m³)',
        data: pm10,
        borderColor: '#0284C7',
        backgroundColor: 'rgba(2, 132, 199, 0.10)',
        borderWidth: 2,
        tension: 0.35,
        fill: false,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: palette.text, boxWidth: 12, font: { size: 11 } } },
      tooltip: { backgroundColor: palette.tooltipBg, padding: 10, cornerRadius: 8 },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: palette.text, maxTicksLimit: 8, font: { size: 11 } } },
      y: { beginAtZero: true, grid: { color: palette.grid }, ticks: { color: palette.text, font: { size: 11 } } },
    },
  };

  return (
    <div className="h-64 w-full">
      <Line data={data} options={options} />
    </div>
  );
}

export function PollutantBreakdownChart({
  current,
  theme,
}: {
  current: AirQualityCurrent;
  theme: ThemeMode;
}) {
  const palette = getThemeColors(theme);

  const items = [
    { label: 'PM2.5', value: current.pm2_5 },
    { label: 'PM10', value: current.pm10 },
    { label: 'NO₂', value: current.nitrogen_dioxide },
    { label: 'O₃', value: current.ozone },
    { label: 'SO₂', value: current.sulphur_dioxide },
  ];

  const data = {
    labels: items.map((i) => i.label),
    datasets: [
      {
        label: 'Concentration (µg/m³)',
        data: items.map((i) => (i.value != null ? Number(i.value.toFixed(1)) : 0)),
        backgroundColor: ['#059669', '#0F5132', '#0D9488', '#D97706', '#64748B'],
        borderRadius: 6,
        maxBarThickness: 42,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: palette.tooltipBg,
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => `${ctx.parsed.y} µg/m³`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: palette.text, font: { size: 11 } } },
      y: { beginAtZero: true, grid: { color: palette.grid }, ticks: { color: palette.text, font: { size: 11 } } },
    },
  };

  return (
    <div className="h-60 w-full">
      <Bar data={data} options={options} />
    </div>
  );
}

export function HourlyUvSolarChart({
  hourly,
  mode,
  theme,
}: {
  hourly: WeatherHourly;
  mode: 'uv' | 'solar';
  theme: ThemeMode;
}) {
  const palette = getThemeColors(theme);

  const { labels, primary, secondary } = useMemo(() => {
    const now = Date.now();
    let startIdx = hourly.time.findIndex((t) => Date.parse(t) >= now - 3600 * 1000);
    if (startIdx < 0) startIdx = 0;
    const endIdx = Math.min(hourly.time.length, startIdx + 24);
    const lbls: string[] = [];
    const p: Array<number | null> = [];
    const s: Array<number | null> = [];
    for (let i = startIdx; i < endIdx; i++) {
      lbls.push(new Date(hourly.time[i]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      if (mode === 'uv') {
        p.push(hourly.uv_index[i] ?? null);
      } else {
        p.push(hourly.direct_radiation[i] ?? null);
        s.push(hourly.diffuse_radiation[i] ?? null);
      }
    }
    return { labels: lbls, primary: p, secondary: s };
  }, [hourly, mode]);

  const data =
    mode === 'uv'
      ? {
          labels,
          datasets: [
            {
              label: 'UV Index',
              data: primary,
              borderColor: '#D97706',
              backgroundColor: 'rgba(217, 119, 6, 0.16)',
              borderWidth: 2,
              tension: 0.35,
              fill: true,
              pointRadius: 2,
            },
          ],
        }
      : {
          labels,
          datasets: [
            {
              label: 'Direct Solar Radiation (W/m²)',
              data: primary,
              borderColor: '#F59E0B',
              backgroundColor: 'rgba(245, 158, 11, 0.16)',
              borderWidth: 2,
              tension: 0.35,
              fill: true,
              pointRadius: 2,
            },
            {
              label: 'Diffuse Radiation (W/m²)',
              data: secondary,
              borderColor: '#0284C7',
              backgroundColor: 'rgba(2, 132, 199, 0.1)',
              borderWidth: 1.5,
              borderDash: [4, 4],
              tension: 0.35,
              fill: false,
              pointRadius: 1.5,
            },
          ],
        };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: palette.text, boxWidth: 12, font: { size: 11 } } },
      tooltip: { backgroundColor: palette.tooltipBg, padding: 10, cornerRadius: 8 },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: palette.text, maxTicksLimit: 8, font: { size: 11 } } },
      y: { beginAtZero: true, grid: { color: palette.grid }, ticks: { color: palette.text, font: { size: 11 } } },
    },
  };

  return (
    <div className="h-64 w-full">
      <Line data={data} options={options} />
    </div>
  );
}

export function HourlyTempPrecipChart({
  hourly,
  units,
  theme,
}: {
  hourly: WeatherHourly;
  units: UnitSystem;
  theme: ThemeMode;
}) {
  const palette = getThemeColors(theme);

  const { labels, temps, rainProbs } = useMemo(() => {
    const now = Date.now();
    let startIdx = hourly.time.findIndex((t) => Date.parse(t) >= now - 3600 * 1000);
    if (startIdx < 0) startIdx = 0;
    const endIdx = Math.min(hourly.time.length, startIdx + 24);
    const lbls: string[] = [];
    const ts: Array<number | null> = [];
    const rps: Array<number | null> = [];
    for (let i = startIdx; i < endIdx; i++) {
      lbls.push(new Date(hourly.time[i]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      const rawC = hourly.temperature_2m[i];
      ts.push(rawC == null ? null : units === 'imperial' ? Number(((rawC * 9) / 5 + 32).toFixed(1)) : Number(rawC.toFixed(1)));
      rps.push(hourly.precipitation_probability[i] ?? 0);
    }
    return { labels: lbls, temps: ts, rainProbs: rps };
  }, [hourly, units]);

  const data = {
    labels,
    datasets: [
      {
        label: `Temperature (°${units === 'imperial' ? 'F' : 'C'})`,
        data: temps,
        borderColor: '#059669',
        backgroundColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.14)' : 'rgba(5, 150, 105, 0.10)',
        borderWidth: 2,
        tension: 0.35,
        fill: true,
        yAxisID: 'y',
        pointRadius: 2,
      },
      {
        label: 'Precipitation Prob (%)',
        data: rainProbs,
        borderColor: '#0284C7',
        backgroundColor: 'rgba(2, 132, 199, 0.12)',
        borderWidth: 1.5,
        borderDash: [4, 4],
        tension: 0.3,
        fill: false,
        yAxisID: 'y1',
        pointRadius: 1.5,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: palette.text, boxWidth: 12, font: { size: 11 } } },
      tooltip: { backgroundColor: palette.tooltipBg, padding: 10, cornerRadius: 8 },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: palette.text, maxTicksLimit: 8, font: { size: 11 } } },
      y: { type: 'linear', position: 'left', grid: { color: palette.grid }, ticks: { color: palette.text, font: { size: 11 } } },
      y1: {
        type: 'linear',
        position: 'right',
        min: 0,
        max: 100,
        grid: { drawOnChartArea: false },
        ticks: { color: palette.text, font: { size: 11 }, callback: (v) => `${v}%` },
      },
    },
  };

  return (
    <div className="h-64 w-full">
      <Line data={data} options={options} />
    </div>
  );
}

export function WeeklyForecastChart({
  daily,
  units,
  theme,
}: {
  daily: WeatherDaily;
  units: UnitSystem;
  theme: ThemeMode;
}) {
  const palette = getThemeColors(theme);

  const convert = (c: number | null) =>
    c == null ? null : units === 'imperial' ? Number(((c * 9) / 5 + 32).toFixed(1)) : Number(c.toFixed(1));

  const labels = daily.time.map((d) =>
    new Date(`${d}T12:00:00`).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
  );

  const data = {
    labels,
    datasets: [
      {
        label: `Max (°${units === 'imperial' ? 'F' : 'C'})`,
        data: daily.temperature_2m_max.map(convert),
        borderColor: '#D97706',
        backgroundColor: 'rgba(217, 119, 6, 0.1)',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 3,
      },
      {
        label: `Min (°${units === 'imperial' ? 'F' : 'C'})`,
        data: daily.temperature_2m_min.map(convert),
        borderColor: '#059669',
        backgroundColor: 'rgba(5, 150, 105, 0.1)',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 3,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: palette.text, boxWidth: 12, font: { size: 11 } } },
      tooltip: { backgroundColor: palette.tooltipBg, padding: 10, cornerRadius: 8 },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: palette.text, font: { size: 11 } } },
      y: { grid: { color: palette.grid }, ticks: { color: palette.text, font: { size: 11 } } },
    },
  };

  return (
    <div className="h-60 w-full">
      <Line data={data} options={options} />
    </div>
  );
}

const CITY_COLORS = ['#059669', '#0284C7', '#D97706', '#7C3AED'];

export function ComparisonBarChart({
  snapshots,
  theme,
}: {
  snapshots: ComparisonSnapshot[];
  theme: ThemeMode;
}) {
  const palette = getThemeColors(theme);
  const valid = snapshots.filter((s) => s.airQuality || s.weather);

  const data = {
    labels: ['US AQI', 'PM2.5 (µg/m³)', 'PM10 (µg/m³)', 'Humidity (%)'],
    datasets: valid.map((s, idx) => ({
      label: s.location.name,
      data: [
        s.airQuality?.current.us_aqi ?? 0,
        s.airQuality?.current.pm2_5 ?? 0,
        s.airQuality?.current.pm10 ?? 0,
        s.weather?.current.relative_humidity_2m ?? 0,
      ],
      backgroundColor: CITY_COLORS[idx % CITY_COLORS.length],
      borderRadius: 5,
      maxBarThickness: 28,
    })),
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: palette.text, boxWidth: 12, font: { size: 11 } } },
      tooltip: { backgroundColor: palette.tooltipBg, padding: 10, cornerRadius: 8 },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: palette.text, font: { size: 11 } } },
      y: { beginAtZero: true, grid: { color: palette.grid }, ticks: { color: palette.text, font: { size: 11 } } },
    },
  };

  return (
    <div className="h-64 w-full">
      <Bar data={data} options={options} />
    </div>
  );
}

export function ComparisonHourlyTrendChart({
  snapshots,
  metric,
  units,
  theme,
}: {
  snapshots: ComparisonSnapshot[];
  metric: 'us_aqi' | 'temperature';
  units: UnitSystem;
  theme: ThemeMode;
}) {
  const palette = getThemeColors(theme);
  const baseLabels = useMemo(() => {
    const firstWithHourly = snapshots.find((s) => s.airQuality?.hourly.time.length || s.weather?.hourly.time.length);
    const times = firstWithHourly?.airQuality?.hourly.time ?? firstWithHourly?.weather?.hourly.time ?? [];
    const now = Date.now();
    let startIdx = times.findIndex((t) => Date.parse(t) >= now - 3600 * 1000);
    if (startIdx < 0) startIdx = 0;
    return times.slice(startIdx, startIdx + 24).map((t) =>
      new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    );
  }, [snapshots]);

  const datasets = snapshots
    .filter((s) => (metric === 'us_aqi' ? s.airQuality : s.weather))
    .map((s, idx) => {
      const times = metric === 'us_aqi' ? s.airQuality!.hourly.time : s.weather!.hourly.time;
      const now = Date.now();
      let startIdx = times.findIndex((t) => Date.parse(t) >= now - 3600 * 1000);
      if (startIdx < 0) startIdx = 0;
      const slice =
        metric === 'us_aqi'
          ? s.airQuality!.hourly.us_aqi.slice(startIdx, startIdx + 24)
          : s.weather!.hourly.temperature_2m.slice(startIdx, startIdx + 24).map((c) =>
              c == null ? null : units === 'imperial' ? Number(((c * 9) / 5 + 32).toFixed(1)) : Number(c.toFixed(1)),
            );

      return {
        label: s.location.name,
        data: slice,
        borderColor: CITY_COLORS[idx % CITY_COLORS.length],
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 1.5,
        spanGaps: true,
      };
    });

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: palette.text, boxWidth: 12, font: { size: 11 } } },
      tooltip: { backgroundColor: palette.tooltipBg, padding: 10, cornerRadius: 8 },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: palette.text, maxTicksLimit: 8, font: { size: 11 } } },
      y: { grid: { color: palette.grid }, ticks: { color: palette.text, font: { size: 11 } } },
    },
  };

  return (
    <div className="h-64 w-full">
      <Line data={{ labels: baseLabels, datasets }} options={options} />
    </div>
  );
}

export function DataLabChart({
  labels,
  primaryLabel,
  primaryData,
  secondaryLabel,
  secondaryData,
  chartType,
  theme,
}: {
  labels: string[];
  primaryLabel: string;
  primaryData: Array<number | null>;
  secondaryLabel?: string;
  secondaryData?: Array<number | null>;
  chartType: 'line' | 'bar';
  theme: ThemeMode;
}) {
  const palette = getThemeColors(theme);

  const datasets = [
    {
      label: primaryLabel,
      data: primaryData,
      borderColor: '#059669',
      backgroundColor: chartType === 'bar' ? 'rgba(5, 150, 105, 0.75)' : 'rgba(5, 150, 105, 0.14)',
      borderWidth: 2,
      tension: 0.3,
      fill: chartType === 'line',
      yAxisID: 'y',
      pointRadius: 1.5,
      spanGaps: true,
    },
    ...(secondaryLabel && secondaryData
      ? [
          {
            label: secondaryLabel,
            data: secondaryData,
            borderColor: '#0284C7',
            backgroundColor: chartType === 'bar' ? 'rgba(2, 132, 199, 0.75)' : 'rgba(2, 132, 199, 0.1)',
            borderWidth: 2,
            tension: 0.3,
            fill: false,
            yAxisID: 'y1',
            pointRadius: 1.5,
            spanGaps: true,
          },
        ]
      : []),
  ];

  const commonScales = {
    x: { grid: { display: false }, ticks: { color: palette.text, maxTicksLimit: 10, font: { size: 11 } } },
    y: { type: 'linear' as const, position: 'left' as const, grid: { color: palette.grid }, ticks: { color: palette.text, font: { size: 11 } } },
    ...(secondaryLabel
      ? {
          y1: {
            type: 'linear' as const,
            position: 'right' as const,
            grid: { drawOnChartArea: false },
            ticks: { color: palette.text, font: { size: 11 } },
          },
        }
      : {}),
  };

  if (chartType === 'bar') {
    return (
      <div className="h-80 w-full">
        <Bar
          data={{ labels, datasets }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
              legend: { labels: { color: palette.text, boxWidth: 12, font: { size: 11 } } },
              tooltip: { backgroundColor: palette.tooltipBg, padding: 10, cornerRadius: 8 },
            },
            scales: commonScales,
          }}
        />
      </div>
    );
  }

  return (
    <div className="h-80 w-full">
      <Line
        data={{ labels, datasets }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { labels: { color: palette.text, boxWidth: 12, font: { size: 11 } } },
            tooltip: { backgroundColor: palette.tooltipBg, padding: 10, cornerRadius: 8 },
          },
          scales: commonScales,
        }}
      />
    </div>
  );
}
