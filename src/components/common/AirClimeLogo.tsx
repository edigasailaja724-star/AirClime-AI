interface AirClimeLogoProps {
  compact?: boolean;
  variant?: 'horizontal' | 'stacked' | 'emblem';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  animated?: boolean;
  className?: string;
}

export function AirClimeLogo({
  compact = false,
  variant = 'horizontal',
  size,
  showTagline,
  animated = false,
  className = '',
}: AirClimeLogoProps) {
  const resolvedSize = size ?? (compact ? 'sm' : 'md');
  const shouldShowTagline = showTagline ?? (!compact && variant !== 'emblem');

  const badgeSizeClass =
    resolvedSize === 'xs'
      ? 'w-8 h-8'
      : resolvedSize === 'sm'
        ? 'w-9 h-9'
        : resolvedSize === 'lg'
          ? 'w-20 h-20 sm:w-24 sm:h-24'
          : 'w-11 h-11';

  const titleSizeClass =
    resolvedSize === 'xs'
      ? 'text-sm'
      : resolvedSize === 'sm'
        ? 'text-base'
        : resolvedSize === 'lg'
          ? 'text-2xl sm:text-3xl'
          : 'text-lg';

  const taglineSizeClass =
    resolvedSize === 'lg' ? 'text-xs sm:text-[13px]' : 'text-[10px]';

  const emblem = (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${badgeSizeClass}`}>
      {animated && (
        <span
          aria-hidden="true"
          className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-[#0B4B94]/25 via-[#0EA5E9]/25 to-[#10B981]/30 animate-ping [animation-duration:2.2s]"
        />
      )}
      <picture className="relative block w-full h-full rounded-full shadow-sm ring-1 ring-slate-900/5 dark:ring-white/15 bg-white">
        <source srcSet="/assets/airclime-circle.webp" type="image/webp" />
        <img
          src="/assets/airclime-circle.png"
          alt="AirClime Earth and Leaf Circular Emblem"
          width={512}
          height={512}
          decoding="async"
          fetchPriority="high"
          className={`w-full h-full rounded-full object-contain block ${
            animated ? 'animate-pulse [animation-duration:2.8s]' : ''
          }`}
        />
      </picture>
    </div>
  );

  if (variant === 'emblem') {
    return (
      <div className={`inline-flex items-center justify-center select-none shrink-0 ${className}`}>
        {emblem}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex select-none shrink-0 ${
        variant === 'stacked'
          ? 'flex-col items-center text-center gap-2.5'
          : 'flex-row items-center gap-2.5'
      } ${className}`}
    >
      {emblem}
      <div className={`min-w-0 ${variant === 'stacked' ? 'text-center' : 'text-left'}`}>
        <span
          className={`block font-display font-bold tracking-tight leading-none ${titleSizeClass}`}
        >
          <span className="text-[#0B4B94] dark:text-sky-400">Air</span>
          <span className="text-[#0F7A3E] dark:text-emerald-400">Clime</span>
        </span>
        {shouldShowTagline && (
          <span
            className={`block mt-1 font-medium tracking-wide text-slate-600 dark:text-slate-300 whitespace-nowrap ${taglineSizeClass}`}
          >
            Breathe Better <span className="text-emerald-600 dark:text-emerald-400">•</span> Together
          </span>
        )}
      </div>
    </div>
  );
}
