import { useMemo, useRef, useState } from 'react';
import { Search, X, Check, Plus, FlaskConical } from 'lucide-react';
import cn from '../../utils/cn.js';
import { formatMoney } from '../../utils/currency.js';
import useClickOutside from '../../hooks/useClickOutside.js';

const CATEGORY_LABELS = {
  EEG: 'EEG',
  EMG: 'EMG',
  NCS: 'NCS',
  EMG_NCS: 'EMG & NCS',
  DOPPLER: 'Doppler / Duplex',
  GENERAL: 'Other investigations',
};

/**
 * Searchable, keyboard-driven multi-select for investigations.
 *
 * Prices shown here are only a preview: the server recalculates the total
 * from the database before the receipt is written.
 */
export function TestSelector({ tests = [], value = [], onChange, currencySymbol = 'Tk.', error, loading = false }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useClickOutside(containerRef, () => setOpen(false), open);

  const selected = useMemo(() => value.map((id) => tests.find((t) => t.id === id)).filter(Boolean), [value, tests]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tests;
    return tests.filter(
      (test) =>
        test.name.toLowerCase().includes(q) ||
        (test.shortCode || '').toLowerCase().includes(q) ||
        (test.category || '').toLowerCase().includes(q)
    );
  }, [tests, query]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const test of filtered) {
      const key = test.category || 'GENERAL';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(test);
    }
    return [...map.entries()];
  }, [filtered]);

  const flat = useMemo(() => grouped.flatMap(([, items]) => items), [grouped]);

  const toggle = (id) => {
    const next = value.includes(id) ? value.filter((v) => v !== id) : [...value, id];
    onChange(next);
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, flat.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (event.key === 'Enter' && open && flat[highlight]) {
      event.preventDefault();
      toggle(flat[highlight].id);
    } else if (event.key === 'Escape') {
      setOpen(false);
    } else if (event.key === 'Backspace' && !query && selected.length) {
      onChange(value.slice(0, -1));
    }
  };

  const total = selected.reduce((sum, test) => sum + Number(test.price), 0);

  return (
    <div className="w-full" ref={containerRef}>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor="test-search" className="text-sm font-medium text-ink-muted">
          Investigations <span className="text-state-danger">*</span>
        </label>
        <span className="text-xs text-ink-subtle">
          {selected.length ? `${selected.length} selected` : `${tests.length} available`}
        </span>
      </div>

      <div className="relative">
        <div
          className={cn(
            'flex min-h-[2.75rem] flex-wrap items-center gap-1.5 rounded-md border bg-surface px-2.5 py-2 transition',
            open ? 'border-brand-500 ring-4 ring-brand-500/15' : 'border-line',
            error && 'border-state-danger'
          )}
          onClick={() => {
            setOpen(true);
            inputRef.current?.focus();
          }}
        >
          <Search size={16} className="shrink-0 text-ink-subtle" />

          {selected.map((test) => (
            <span
              key={test.id}
              className="inline-flex max-w-full items-center gap-1 rounded bg-brand-50 py-0.5 pl-2 pr-1 text-xs font-medium text-brand-800 dark:bg-brand-900/50 dark:text-brand-200"
            >
              <span className="truncate">{test.name}</span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  toggle(test.id);
                }}
                className="rounded p-0.5 transition hover:bg-brand-200/70 dark:hover:bg-brand-800"
                aria-label={`Remove ${test.name}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}

          <input
            id="test-search"
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              setHighlight(0);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={selected.length ? 'Add another test…' : 'Search and select tests…'}
            className="min-w-[8rem] flex-1 border-0 bg-transparent p-0 text-sm text-ink outline-none placeholder:text-ink-subtle"
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-controls="test-listbox"
          />
        </div>

        {open ? (
          <div
            id="test-listbox"
            role="listbox"
            className="absolute z-30 mt-1 max-h-80 w-full animate-slide-up overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-pop"
          >
            {loading ? (
              <div className="space-y-1 p-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="skeleton h-8 w-full" />
                ))}
              </div>
            ) : !flat.length ? (
              <div className="px-3 py-6 text-center text-sm text-ink-subtle">
                No test matches “{query}”.
                <br />
                Ask an administrator to add it under Tests &amp; prices.
              </div>
            ) : (
              grouped.map(([category, items]) => (
                <div key={category} className="mb-1 last:mb-0">
                  <p className="px-2 py-1 text-[0.66rem] font-semibold uppercase tracking-wider text-ink-subtle">
                    {CATEGORY_LABELS[category] || category}
                  </p>
                  {items.map((test) => {
                    const index = flat.indexOf(test);
                    const isSelected = value.includes(test.id);
                    return (
                      <button
                        key={test.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onMouseEnter={() => setHighlight(index)}
                        onClick={() => toggle(test.id)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition',
                          index === highlight ? 'bg-surface-sunken' : 'hover:bg-surface-sunken',
                          isSelected && 'bg-brand-50 dark:bg-brand-900/30'
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition',
                            isSelected ? 'border-brand-600 bg-brand-600 text-white' : 'border-line-strong'
                          )}
                        >
                          {isSelected ? <Check size={11} strokeWidth={3} /> : null}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-ink">{test.name}</span>
                        <span className="shrink-0 tabular text-xs font-medium text-ink-muted">
                          {currencySymbol} {formatMoney(test.price, { decimals: 0 })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        ) : null}
      </div>

      {error ? <p className="mt-1 text-xs font-medium text-state-danger">{error}</p> : null}

      {/* Selected lines, exactly as they will be printed */}
      <div className="mt-3 overflow-hidden rounded-lg border border-line">
        {selected.length ? (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-raised text-xs uppercase tracking-wide text-ink-subtle">
                  <th className="w-10 px-3 py-2 text-left font-semibold">No.</th>
                  <th className="px-3 py-2 text-left font-semibold">Description</th>
                  <th className="w-28 px-3 py-2 text-right font-semibold">{currencySymbol}</th>
                  <th className="w-10 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {selected.map((test, index) => (
                  <tr key={test.id} className="border-t border-line">
                    <td className="px-3 py-2 tabular text-ink-subtle">{String(index + 1).padStart(2, '0')}</td>
                    <td className="px-3 py-2 text-ink">{test.name}</td>
                    <td className="px-3 py-2 text-right tabular text-ink">{formatMoney(test.price)}</td>
                    <td className="px-2 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => toggle(test.id)}
                        className="rounded p-1 text-ink-subtle transition hover:bg-state-danger/10 hover:text-state-danger"
                        aria-label={`Remove ${test.name}`}
                      >
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-line-strong bg-surface-raised">
                  <td colSpan={2} className="px-3 py-2.5 text-right text-sm font-semibold text-ink">
                    Total {currencySymbol}
                  </td>
                  <td className="px-3 py-2.5 text-right text-base font-bold tabular text-brand-700 dark:text-brand-300">
                    {formatMoney(total)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
            <p className="border-t border-line bg-surface px-3 py-2 text-[0.7rem] text-ink-subtle">
              The server recalculates this total from the price list before the receipt is issued.
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 bg-surface px-4 py-8 text-center">
            <FlaskConical size={22} className="text-ink-subtle" />
            <p className="text-sm font-medium text-ink">No test selected yet</p>
            <p className="max-w-xs text-xs text-ink-subtle">
              Search above, or press <kbd className="rounded border border-line px-1">↓</kbd> to browse the list.
            </p>
            <button
              type="button"
              onClick={() => {
                setOpen(true);
                inputRef.current?.focus();
              }}
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline dark:text-brand-300"
            >
              <Plus size={13} /> Add tests
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default TestSelector;
