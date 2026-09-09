import { useId } from 'react';
import cn from '../../utils/cn.js';
import { Field } from './Field.jsx';
import { buildRamp, readableInk, rgbToHex, hexToRgb, rgbToHsl } from '../../utils/theme.js';

const STEPS = [50, 100, 300, 500, 700, 900];

/**
 * A colour the ramp cannot rescue: too grey to read as a brand, or so pale
 * that every generated shade comes out washed out. Clicking a 50/100 swatch
 * is the easy way to land here by accident.
 */
function paletteWarning(value) {
  const rgb = hexToRgb(value);
  if (!rgb) return null;
  const { s, l } = rgbToHsl(rgb);
  if (s < 18) return 'Very low saturation - the interface will look grey rather than branded.';
  if (l > 78) return 'Very light - buttons and highlights will look washed out.';
  return null;
}

/**
 * Colour input that previews the whole generated ramp.
 *
 * The swatches are not decoration: clicking one adopts that shade as the base
 * colour, which is how you nudge a brand colour lighter or darker without
 * hunting for a hex value.
 */
export function ColorField({ label, value, onChange, error, hint, presets = [], className }) {
  const id = useId();
  const ramp = buildRamp(value);
  const current = (value || '').toLowerCase();
  const warning = paletteWarning(value);

  return (
    <Field label={label} htmlFor={id} error={error} hint={hint} className={className}>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value || '') ? value : '#0f766e'}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-line bg-surface p-1"
          aria-label={`${label} colour picker`}
        />
        <input
          type="text"
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          className={cn('input-base font-mono uppercase', error && 'input-invalid')}
          placeholder="#0f766e"
        />
      </div>

      <div className="mt-2">
        <div className="flex overflow-hidden rounded-md border border-line">
          {STEPS.map((step) => {
            const hex = rgbToHex(ramp[step]);
            const active = hex.toLowerCase() === current;
            return (
              <button
                key={step}
                type="button"
                onClick={() => onChange(hex)}
                title={`Use ${hex} (step ${step})`}
                aria-label={`Use shade ${step}, ${hex}`}
                className={cn(
                  'relative flex h-8 flex-1 items-center justify-center text-[0.6rem] font-semibold transition',
                  'hover:z-10 hover:ring-2 hover:ring-inset hover:ring-white/70 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white',
                  active && 'z-10 ring-2 ring-inset ring-white'
                )}
                style={{ background: hex, color: readableInk(hex) }}
              >
                {active ? '●' : step}
              </button>
            );
          })}
        </div>
        {warning ? (
          <p className="mt-1 text-[0.68rem] font-medium text-state-warning">{warning}</p>
        ) : (
          <p className="mt-1 text-[0.68rem] text-ink-subtle">Click a shade to use it as the base colour.</p>
        )}
      </div>

      {presets.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {presets.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => onChange(preset.value)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs transition',
                current === preset.value.toLowerCase()
                  ? 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200'
                  : 'border-line text-ink-muted hover:border-line-strong hover:bg-surface-raised'
              )}
            >
              <span className="h-3 w-3 rounded-full" style={{ background: preset.value }} />
              {preset.name}
            </button>
          ))}
        </div>
      ) : null}
    </Field>
  );
}

export default ColorField;
