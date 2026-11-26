import { useEffect, useState } from 'react';
import { getUsAqiCategory } from '../../utils/airQuality';

interface AnimatedAqiGaugeProps {
  usAqi: number | null | undefined;
  dominantPollutant?: string;
}

export function AnimatedAqiGauge({ usAqi, dominantPollutant }: AnimatedAqiGaugeProps) {
  const cat = getUsAqiCategory(usAqi);
  const clamped = usAqi != null && Number.isFinite(usAqi) ? Math.max(0, Math.min(350, usAqi)) : 0;
  const targetRatio = clamped / 350;

  const [animatedRatio, setAnimatedRatio] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimatedRatio(targetRatio));
    return () => cancelAnimationFrame(id);
  }, [targetRatio]);

  const radius = 84;
  const circumference = Math.PI * radius; // semi-circle arc length
  const strokeDashoffset = circumference * (1 - animatedRatio);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-56 h-32 flex items-end justify-center">
        <svg viewBox="0 0 200 115" className="w-full h-full overflow-visible" aria-hidden="true">
          {/* Background track */}
          <path
            d="M 16 100 A 84 84 0 0 1 184 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="14"
            strokeLinecap="round"
            className="text-slate-200 dark:text-slate-800"
          />
          {/* Animated value arc */}
          <path
            d="M 16 100 A 84 84 0 0 1 184 100"
            fill="none"
            stroke={cat.accentHex}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.16, 1, 0.3, 1), stroke 300ms ease' }}
          />
        </svg>

        <div className="absolute bottom-1 text-center">
          <div className={`text-4xl font-bold font-mono tabular-nums leading-none ${cat.textClass}`}>
            {usAqi != null ? Math.round(usAqi) : 'N/A'}
          </div>
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">
            US EPA AQI
          </div>
        </div>
      </div>

      <div className="mt-2 text-center space-y-0.5">
        <p className={`text-sm font-semibold ${cat.textClass}`}>{cat.label}</p>
        {dominantPollutant && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Main pollutant: <span className="font-mono font-medium text-slate-700 dark:text-slate-200">{dominantPollutant}</span>
          </p>
        )}
      </div>
    </div>
  );
}
