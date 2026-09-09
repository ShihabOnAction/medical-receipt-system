import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import cn from '../utils/cn.js';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const TONE = {
  success: 'border-l-state-success',
  error: 'border-l-state-danger',
  warning: 'border-l-state-warning',
  info: 'border-l-state-info',
};

const ICON_TONE = {
  success: 'text-state-success',
  error: 'text-state-danger',
  warning: 'text-state-warning',
  info: 'text-state-info',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (toast) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const entry = {
        id,
        type: toast.type || 'info',
        title: toast.title || '',
        message: toast.message || '',
        duration: toast.duration ?? (toast.type === 'error' ? 7000 : 4000),
      };
      setToasts((current) => [...current.slice(-3), entry]);
      if (entry.duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), entry.duration)
        );
      }
      return id;
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      push,
      dismiss,
      success: (message, title = 'Done') => push({ type: 'success', title, message }),
      error: (message, title = 'Something went wrong') => push({ type: 'error', title, message }),
      warning: (message, title = 'Heads up') => push({ type: 'warning', title, message }),
      info: (message, title = '') => push({ type: 'info', title, message }),
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end no-print"
        role="region"
        aria-live="polite"
        aria-label="Notifications"
      >
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type] || Info;
          return (
            <div
              key={toast.id}
              className={cn(
                'pointer-events-auto w-full max-w-sm animate-slide-in-right rounded-lg border border-line border-l-4 bg-surface p-3 shadow-pop',
                TONE[toast.type]
              )}
            >
              <div className="flex gap-3">
                <Icon size={18} className={cn('mt-0.5 shrink-0', ICON_TONE[toast.type])} />
                <div className="min-w-0 flex-1">
                  {toast.title ? <p className="text-sm font-semibold text-ink">{toast.title}</p> : null}
                  {toast.message ? (
                    <p className="mt-0.5 break-words text-sm text-ink-muted">{toast.message}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  className="shrink-0 rounded p-1 text-ink-subtle transition hover:bg-surface-sunken hover:text-ink"
                  aria-label="Dismiss notification"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>.');
  return context;
}

export default ToastContext;
