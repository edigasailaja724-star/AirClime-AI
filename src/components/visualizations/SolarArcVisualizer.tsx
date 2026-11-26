interface SolarArcVisualizerProps {
  progressPercent: number;
  sunriseLabel: string;
  sunsetLabel: string;
  solarNoonLabel: string;
  elevationDeg: number;
  isDaylight: boolean;
}

export function SolarArcVisualizer({
  progressPercent,
  sunriseLabel,
  sunsetLabel,
  solarNoonLabel,
  elevationDeg,
  isDaylight,
}: SolarArcVisualizerProps) {
  const clamped = Math.max(0, Math.min(100, progressPercent));
  // Angle along semi-circle from PI (left) to 0 (right)
  const theta = Math.PI * (1 - clamped / 100);
  const cx = 160;
  const cy = 128;
  const r = 104;
  const sunX = cx + r * Math.cos(theta);
  const sunY = cy - r * Math.sin(theta);

  return (
    <div className="w-full">
      <div className="relative w-full max-w-md mx-auto">
        <svg viewBox="0 0 320 155" className="w-full h-auto" aria-label="Sunrise to sunset solar arc">
          <defs>
            <linearGradient id="airclime-solar-arc" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="50%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#EA580C" />
            </linearGradient>
          </defs>

          {/* Horizon line */}
          <line
            x1="28"
            y1={cy}
            x2="292"
            y2={cy}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="text-slate-300 dark:text-slate-700"
          />

          {/* Daylight track arc */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-slate-200 dark:text-slate-800"
          />

          {/* Active elapsed arc */}
          {clamped > 0 && (
            <path
              d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${sunX.toFixed(1)} ${sunY.toFixed(1)}`}
              fill="none"
              stroke="url(#airclime-solar-arc)"
              strokeWidth="4"
              strokeLinecap="round"
            />
          )}

          {/* Solar noon marker */}
          <circle cx={cx} cy={cy - r} r="3" className="fill-amber-400/70" />
          <text
            x={cx}
            y={cy - r - 10}
            textAnchor="middle"
            className="fill-slate-500 dark:fill-slate-400 text-[9px] font-mono"
          >
            Noon {solarNoonLabel}
          </text>

          {/* Sun position orb */}
          <g style={{ transition: 'transform 500ms ease' }}>
            <circle
              cx={sunX}
              cy={sunY}
              r="11"
              className={isDaylight ? 'fill-amber-400/25' : 'fill-slate-400/20'}
            />
            <circle
              cx={sunX}
              cy={sunY}
              r="6"
              className={isDaylight ? 'fill-amber-500 stroke-white dark:stroke-slate-900' : 'fill-slate-400 stroke-white'}
              strokeWidth="2"
            />
          </g>

          {/* Sunrise & Sunset Labels */}
          <text x={cx - r} y={cy + 18} textAnchor="middle" className="fill-slate-600 dark:fill-slate-300 text-[10px] font-mono">
            {sunriseLabel}
          </text>
          <text x={cx + r} y={cy + 18} textAnchor="middle" className="fill-slate-600 dark:fill-slate-300 text-[10px] font-mono">
            {sunsetLabel}
          </text>
        </svg>
      </div>

      <div className="flex items-center justify-center gap-6 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-1">
        <span>Daylight elapsed: {clamped}%</span>
        <span>Solar elevation: {elevationDeg}°</span>
      </div>
    </div>
  );
}
