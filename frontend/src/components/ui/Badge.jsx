import cn from '../../utils/cn.js';

const TONES = {
  neutral: 'bg-surface-sunken text-ink-muted ring-line',
  brand: 'bg-brand-50 text-brand-800 ring-brand-200 dark:bg-brand-900/40 dark:text-brand-200 dark:ring-brand-800',
  success: 'bg-state-success/10 text-state-success ring-state-success/25',
  warning: 'bg-state-warning/10 text-state-warning ring-state-warning/25',
  danger: 'bg-state-danger/10 text-state-danger ring-state-danger/25',
  info: 'bg-state-info/10 text-state-info ring-state-info/25',
};

const SIZES = {
  sm: 'px-1.5 py-0.5 text-[0.68rem]',
  md: 'px-2 py-0.5 text-xs',
};

export function Badge({ children, tone = 'neutral', size = 'md', dot = false, className, icon: Icon }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium ring-1 ring-inset whitespace-nowrap',
        TONES[tone] || TONES.neutral,
        SIZES[size] || SIZES.md,
        className
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {Icon ? <Icon size={12} /> : null}
      {children}
    </span>
  );
}

const STATUS_TONE = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  SUSPENDED: 'danger',
  ACTIVE: 'success',
  VOID: 'danger',
};

/** Shared badge for user status and receipt status. */
export function StatusBadge({ status, className }) {
  if (!status) return null;
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return (
    <Badge tone={STATUS_TONE[status] || 'neutral'} dot className={className}>
      {status === 'VOID' ? 'Cancelled' : label}
    </Badge>
  );
}

export function RoleBadge({ role }) {
  if (!role) return null;
  return <Badge tone={role === 'ADMIN' ? 'brand' : 'neutral'}>{role === 'ADMIN' ? 'Administrator' : 'Staff'}</Badge>;
}

export default Badge;
