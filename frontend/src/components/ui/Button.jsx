import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import cn from '../../utils/cn.js';

const VARIANTS = {
  primary:
    'bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900 shadow-sm disabled:bg-brand-700/50 dark:bg-brand-600 dark:hover:bg-brand-500',
  secondary:
    'bg-surface text-ink border border-line hover:bg-surface-raised hover:border-line-strong active:bg-surface-sunken',
  ghost: 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
  danger: 'bg-state-danger text-white hover:brightness-95 active:brightness-90 shadow-sm',
  success: 'bg-state-success text-white hover:brightness-95 active:brightness-90 shadow-sm',
  outline: 'border border-brand-600 text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-900/30',
  subtle: 'bg-brand-50 text-brand-800 hover:bg-brand-100 dark:bg-brand-900/40 dark:text-brand-200 dark:hover:bg-brand-900/60',
  link: 'text-brand-700 hover:underline underline-offset-4 dark:text-brand-300 px-0',
};

const SIZES = {
  xs: 'h-7 px-2 text-xs gap-1 rounded',
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-md',
  md: 'h-10 px-4 text-sm gap-2 rounded-md',
  lg: 'h-12 px-6 text-base gap-2 rounded-lg',
  icon: 'h-9 w-9 rounded-md',
};

/**
 * The one button in the app. Every variant reads brand tokens, so a colour
 * change in Settings recolours all of them.
 */
export const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    icon: Icon = null,
    iconRight: IconRight = null,
    className,
    disabled,
    type = 'button',
    fullWidth = false,
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center font-medium transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/25',
        'disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant] || VARIANTS.primary,
        SIZES[size] || SIZES.md,
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : Icon ? <Icon size={16} /> : null}
      {children}
      {!loading && IconRight ? <IconRight size={16} /> : null}
    </button>
  );
});

export default Button;
