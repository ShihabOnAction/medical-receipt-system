import { useRef, useState } from 'react';
import { Sun, Moon, Monitor, Palette, Check } from 'lucide-react';
import cn from '../../utils/cn.js';
import { useTheme } from '../../hooks/useTheme.js';
import useClickOutside from '../../hooks/useClickOutside.js';
import { DENSITIES, MODES } from '../../utils/theme.js';

const MODE_ICON = { light: Sun, dark: Moon, system: Monitor };

/**
 * Per-user appearance controls. Everything here writes a CSS custom
 * property on <html>, so the change is instant and applies app-wide.
 */
export function ThemeMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const theme = useTheme();
  useClickOutside(ref, () => setOpen(false), open);

  const ActiveIcon = MODE_ICON[theme.mode] || Monitor;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition hover:bg-surface-sunken hover:text-ink"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Appearance settings"
      >
        <ActiveIcon size={18} />
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-64 animate-slide-up rounded-lg border border-line bg-surface p-3 shadow-pop">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            <Palette size={13} /> Appearance
          </p>

          <div className="mb-3">
            <p className="mb-1.5 text-xs font-medium text-ink-muted">Theme</p>
            <div className="grid grid-cols-3 gap-1">
              {MODES.map((mode) => {
                const Icon = MODE_ICON[mode.value];
                const active = theme.mode === mode.value;
                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => theme.setMode(mode.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-xs transition',
                      active
                        ? 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200'
                        : 'border-line text-ink-muted hover:bg-surface-sunken'
                    )}
                  >
                    <Icon size={15} />
                    {mode.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-3">
            <p className="mb-1.5 text-xs font-medium text-ink-muted">Row density</p>
            <div className="grid grid-cols-3 gap-1">
              {DENSITIES.map((density) => {
                const active = theme.density === density.value;
                return (
                  <button
                    key={density.value}
                    type="button"
                    onClick={() => theme.setDensity(density.value)}
                    className={cn(
                      'rounded-md border px-2 py-1.5 text-xs transition',
                      active
                        ? 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200'
                        : 'border-line text-ink-muted hover:bg-surface-sunken'
                    )}
                  >
                    {density.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-3">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs font-medium text-ink-muted">Text size</p>
              <span className="text-xs tabular text-ink-subtle">{Math.round(theme.fontScale * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.9"
              max="1.2"
              step="0.05"
              value={theme.fontScale}
              onChange={(event) => theme.setFontScale(event.target.value)}
              className="w-full accent-brand-600"
              aria-label="Text size"
            />
          </div>

          <div className="mb-3">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs font-medium text-ink-muted">Corner rounding</p>
              <span className="text-xs tabular text-ink-subtle">{Math.round(theme.radius * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.25"
              value={theme.radius}
              onChange={(event) => theme.setRadius(event.target.value)}
              className="w-full accent-brand-600"
              aria-label="Corner rounding"
            />
          </div>

          <button
            type="button"
            onClick={theme.reset}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-line px-2 py-1.5 text-xs text-ink-muted transition hover:bg-surface-sunken"
          >
            <Check size={13} /> Reset to defaults
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default ThemeMenu;
