import { forwardRef, useId } from 'react';
import cn from '../../utils/cn.js';

/** Label + control + hint/error wrapper shared by every form input. */
export function Field({ label, htmlFor, error, hint, required, className, children, actions }) {
  return (
    <div className={cn('w-full', className)}>
      {label ? (
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <label htmlFor={htmlFor} className="block text-sm font-medium text-ink-muted">
            {label}
            {required ? <span className="ml-0.5 text-state-danger">*</span> : null}
          </label>
          {actions}
        </div>
      ) : null}
      {children}
      {error ? (
        <p className="mt-1 text-xs font-medium text-state-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef(function Input(
  { label, error, hint, required, className, inputClassName, icon: Icon, suffix, id, actions, ...props },
  ref
) {
  const autoId = useId();
  const inputId = id || autoId;

  return (
    <Field label={label} htmlFor={inputId} error={error} hint={hint} required={required} className={className} actions={actions}>
      <div className="relative">
        {Icon ? (
          <Icon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
        ) : null}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          className={cn('input-base', Icon && 'pl-9', suffix && 'pr-16', error && 'input-invalid', inputClassName)}
          {...props}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-subtle">
            {suffix}
          </span>
        ) : null}
      </div>
    </Field>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, error, hint, required, className, id, rows = 3, ...props },
  ref
) {
  const autoId = useId();
  const inputId = id || autoId;

  return (
    <Field label={label} htmlFor={inputId} error={error} hint={hint} required={required} className={className}>
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        aria-invalid={Boolean(error)}
        className={cn('input-base resize-y', error && 'input-invalid')}
        {...props}
      />
    </Field>
  );
});

export const Select = forwardRef(function Select(
  { label, error, hint, required, className, id, options = [], placeholder, children, actions, ...props },
  ref
) {
  const autoId = useId();
  const inputId = id || autoId;

  return (
    <Field label={label} htmlFor={inputId} error={error} hint={hint} required={required} className={className} actions={actions}>
      <div className="relative">
        <select
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          className={cn('input-base cursor-pointer appearance-none pr-9', error && 'input-invalid')}
          {...props}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {children ??
            options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
        </select>
        <svg
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </Field>
  );
});

export const Checkbox = forwardRef(function Checkbox({ label, description, className, id, ...props }, ref) {
  const autoId = useId();
  const inputId = id || autoId;

  return (
    <label
      htmlFor={inputId}
      className={cn('flex cursor-pointer select-none items-start gap-2.5 text-sm text-ink', className)}
    >
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-line-strong text-brand-700 accent-brand-700 focus:ring-brand-500"
        {...props}
      />
      <span>
        <span className="font-medium">{label}</span>
        {description ? <span className="block text-xs text-ink-subtle">{description}</span> : null}
      </span>
    </label>
  );
});

/** Accessible on/off switch used across Settings. */
export function Switch({ checked, onChange, label, description, disabled, id }) {
  const autoId = useId();
  const inputId = id || autoId;

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={inputId} className="block cursor-pointer text-sm font-medium text-ink">
          {label}
        </label>
        {description ? <p className="mt-0.5 text-xs text-ink-subtle">{description}</p> : null}
      </div>
      <button
        id={inputId}
        type="button"
        role="switch"
        aria-checked={Boolean(checked)}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cn(
          'relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/25',
          checked ? 'bg-brand-600' : 'bg-line-strong',
          disabled && 'cursor-not-allowed opacity-60'
        )}
      >
        <span
          className={cn(
            'inline-block transform rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
          style={{ height: '1.125rem', width: '1.125rem' }}
        />
      </button>
    </div>
  );
}

export default Field;
