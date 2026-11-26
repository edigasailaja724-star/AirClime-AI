import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
} from 'lucide-react';
import { describeWmoCode } from '../../utils/weather';

interface WeatherIconProps {
  code: number | null | undefined;
  className?: string;
}

export function WeatherIcon({ code, className = 'w-5 h-5' }: WeatherIconProps) {
  const { icon } = describeWmoCode(code);

  switch (icon) {
    case 'sun':
      return <Sun className={`${className} text-amber-500`} aria-hidden="true" />;
    case 'partly-cloudy':
      return <CloudSun className={`${className} text-amber-500`} aria-hidden="true" />;
    case 'fog':
      return <CloudFog className={`${className} text-slate-500 dark:text-slate-400`} aria-hidden="true" />;
    case 'drizzle':
      return <CloudDrizzle className={`${className} text-sky-500`} aria-hidden="true" />;
    case 'rain':
      return <CloudRain className={`${className} text-blue-600 dark:text-blue-400`} aria-hidden="true" />;
    case 'snow':
      return <CloudSnow className={`${className} text-sky-400`} aria-hidden="true" />;
    case 'storm':
      return <CloudLightning className={`${className} text-amber-600 dark:text-amber-400`} aria-hidden="true" />;
    case 'cloud':
    default:
      return <Cloud className={`${className} text-slate-500 dark:text-slate-400`} aria-hidden="true" />;
  }
}
