import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import cn from '../../utils/cn.js';

export function Card({ children, className, padded = true, as: Tag = 'div', ...props }) {
  return (
    <Tag className={cn('card', padded && 'p-5', className)} {...props}>
      {children}
    </Tag>
  );
}

export function CardHeader({ title, subtitle, actions, className, icon: Icon }) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
            <Icon size={18} />
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-ink">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Dashboard metric tile. */
export function StatCard({ label, value, hint, icon: Icon, tone = 'brand', loading = false, trend, onClick }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
    success: 'bg-state-success/10 text-state-success',
    warning: 'bg-state-warning/10 text-state-warning',
    danger: 'bg-state-danger/10 text-state-danger',
    info: 'bg-state-info/10 text-state-info',
  };

  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      onClick={onClick}
      className={cn(
        'card flex items-start gap-4 p-4 text-left transition',
        onClick && 'hover:border-brand-300 hover:shadow-pop focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20'
      )}
    >
      {Icon ? (
        <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', tones[tone] || tones.brand)}>
          <Icon size={20} />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">{label}</p>
        <p className="mt-1 flex items-center gap-2 text-2xl font-semibold tabular text-ink">
          {loading ? <Loader2 size={20} className="animate-spin text-ink-subtle" /> : value}
          {trend !== undefined && trend !== null && !loading ? (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-xs font-medium',
                trend >= 0 ? 'text-state-success' : 'text-state-danger'
              )}
            >
              {trend >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {Math.abs(trend)}%
            </span>
          ) : null}
        </p>
        {hint ? <p className="mt-0.5 truncate text-xs text-ink-subtle">{hint}</p> : null}
      </div>
    </Tag>
  );
}

export function Spinner({ size = 20, className, label }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-ink-muted', className)} role="status">
      <Loader2 size={size} className="animate-spin" />
      {label ? <span className="text-sm">{label}</span> : null}
    </span>
  );
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-ink-muted">
      <Loader2 size={28} className="animate-spin text-brand-600" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

/** Section heading used at the top of every page. */
export function PageHeader({ title, subtitle, actions, breadcrumb, className }) {
  return (
    <div className={cn('mb-6 flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {breadcrumb ? <div className="mb-1 text-xs text-ink-subtle">{breadcrumb}</div> : null}
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-ink-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export default Card;
