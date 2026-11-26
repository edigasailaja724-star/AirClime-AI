import { describeWmoCode } from '../../utils/weather';

interface AnimatedWeatherSceneProps {
  weatherCode: number | null | undefined;
  isDay?: number | null;
}

export function AnimatedWeatherScene({ weatherCode, isDay = 1 }: AnimatedWeatherSceneProps) {
  const { icon, label } = describeWmoCode(weatherCode);
  const daytime = isDay !== 0;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 p-4 h-36 flex items-center justify-between ${
        icon === 'storm'
          ? 'bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 text-white'
          : icon === 'rain' || icon === 'drizzle'
            ? 'bg-gradient-to-br from-sky-50 via-slate-100 to-sky-100 dark:from-slate-900 dark:via-[#13222E] dark:to-slate-900'
            : icon === 'snow'
              ? 'bg-gradient-to-br from-slate-50 via-sky-50 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900'
              : daytime
                ? 'bg-gradient-to-br from-emerald-50/70 via-amber-50/50 to-sky-50 dark:from-[#0F241D] dark:via-[#131C21] dark:to-[#101C24]'
                : 'bg-gradient-to-br from-slate-900 via-[#0E1821] to-slate-950 text-white'
      }`}
      aria-label={`Animated weather visualization: ${label}`}
    >
      <div className="z-10 space-y-1">
        <p className="text-[11px] font-medium opacity-75">Live Sky Condition</p>
        <p className="text-base font-bold">{label}</p>
        <p className="text-[11px] opacity-75">
          {daytime ? 'Daylight observation' : 'Nighttime observation'}
        </p>
      </div>

      {/* Animated SVG Scene */}
      <svg viewBox="0 0 140 100" className="w-36 h-24 shrink-0" aria-hidden="true">
        {(icon === 'sun' || icon === 'partly-cloudy') && (
          <g className={daytime ? '' : 'opacity-80'}>
            <circle cx="95" cy="34" r="18" fill={daytime ? '#F59E0B' : '#CBD5E1'} opacity="0.9">
              <animate attributeName="r" values="17;19;17" dur="4s" repeatCount="indefinite" />
            </circle>
            {daytime && (
              <circle cx="95" cy="34" r="26" fill="none" stroke="#FBBF24" strokeWidth="2" strokeDasharray="5 5" opacity="0.55">
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 95 34"
                  to="360 95 34"
                  dur="18s"
                  repeatCount="indefinite"
                />
              </circle>
            )}
          </g>
        )}

        {(icon === 'cloud' || icon === 'partly-cloudy' || icon === 'rain' || icon === 'drizzle' || icon === 'snow' || icon === 'storm' || icon === 'fog') && (
          <g>
            <path
              d="M36 62 H102 C110 62 116 56 116 49 C116 42 110 36 103 36 C101 26 92 20 81 20 C70 20 61 27 59 37 C56 36 53 35 49 35 C39 35 31 43 31 52 C31 58 33 62 36 62 Z"
              fill={icon === 'storm' ? '#475569' : '#94A3B8'}
              opacity={icon === 'fog' ? '0.6' : '0.92'}
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                values="-4 0;4 0;-4 0"
                dur="7s"
                repeatCount="indefinite"
              />
            </path>
          </g>
        )}

        {(icon === 'rain' || icon === 'drizzle' || icon === 'storm') && (
          <g stroke="#38BDF8" strokeWidth="2.2" strokeLinecap="round">
            {[46, 64, 82, 98].map((x, idx) => (
              <line key={x} x1={x} y1="68" x2={x - 4} y2="82">
                <animate
                  attributeName="y1"
                  values="65;78;65"
                  dur={`${0.9 + idx * 0.15}s`}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="y2"
                  values="79;92;79"
                  dur={`${0.9 + idx * 0.15}s`}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.9;0.2;0.9"
                  dur={`${0.9 + idx * 0.15}s`}
                  repeatCount="indefinite"
                />
              </line>
            ))}
          </g>
        )}

        {icon === 'storm' && (
          <polygon points="78,60 68,78 76,78 70,94 88,73 79,73" fill="#FBBF24">
            <animate attributeName="opacity" values="1;0.2;1;0.1;1" dur="2.8s" repeatCount="indefinite" />
          </polygon>
        )}

        {icon === 'snow' && (
          <g fill="#E0F2FE">
            {[46, 66, 86, 102].map((x, idx) => (
              <circle key={x} cx={x} cy="72" r="2.6">
                <animate
                  attributeName="cy"
                  values="66;92;66"
                  dur={`${2.2 + idx * 0.3}s`}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="1;0.2;1"
                  dur={`${2.2 + idx * 0.3}s`}
                  repeatCount="indefinite"
                />
              </circle>
            ))}
          </g>
        )}

        {icon === 'fog' && (
          <g stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round">
            <line x1="28" y1="74" x2="114" y2="74">
              <animate attributeName="x1" values="24;32;24" dur="5s" repeatCount="indefinite" />
            </line>
            <line x1="36" y1="84" x2="106" y2="84">
              <animate attributeName="x2" values="102;112;102" dur="6s" repeatCount="indefinite" />
            </line>
          </g>
        )}
      </svg>
    </div>
  );
}
