import { AlertCircle, RefreshCw } from 'lucide-react';

export function CardSkeleton({ lines = 3, heightClass = 'h-32' }: { lines?: number; heightClass?: string }) {
  return (
    <div
      className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-5 ${heightClass} animate-pulse`}
      aria-busy="true"
      aria-label="Loading environmental data"
    >
      <div className="h-3.5 w-28 rounded bg-slate-200 dark:bg-slate-800 mb-4" />
      <div className="space-y-2.5">
        {Array.from({ length: lines }).map((_, idx) => (
          <div
            key={idx}
            className="h-3 rounded bg-slate-200 dark:bg-slate-800"
            style={{ width: `${Math.max(45, 92 - idx * 16)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function ErrorNotice({
  title = 'Unable to load data',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-rose-200 dark:border-rose-900/70 bg-rose-50/80 dark:bg-rose-950/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">{title}</p>
          <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-950 transition-colors shrink-0 self-start sm:self-center cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-8 text-center">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 max-w-md mx-auto">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 px-4 py-2 rounded-lg text-xs font-medium bg-[#0F5132] hover:bg-[#0c4128] text-white transition-colors cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
