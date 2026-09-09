import { useMemo, useState } from 'react';
import { BarChart3, Table2 } from 'lucide-react';
import cn from '../../utils/cn.js';
import { formatMoney, formatCompact } from '../../utils/currency.js';
import { formatDate } from '../../utils/formatDate.js';

/**
 * Daily collection, last 14 days.
 *
 * One series, so there is no legend to disambiguate and no categorical
 * palette in play - a single brand hue carries magnitude, the axis and grid
 * stay recessive, and every value is also reachable as a table for screen
 * readers and for anyone who cannot separate the bars by colour.
 */
export function CollectionChart({ data = [], currencySymbol = 'Tk.', loading = false, title = 'Daily collection' }) {
  const [view, setView] = useState('chart');
  const [hover, setHover] = useState(null);

  const { bars, max, totalAmount, totalReceipts } = useMemo(() => {
    const peak = Math.max(1, ...data.map((d) => Number(d.amount) || 0));
    return {
      bars: data.map((d) => ({ ...d, amount: Number(d.amount) || 0, ratio: (Number(d.amount) || 0) / peak })),
      max: peak,
      totalAmount: data.reduce((sum, d) => sum + (Number(d.amount) || 0), 0),
      totalReceipts: data.reduce((sum, d) => sum + (Number(d.receipts) || 0), 0),
    };
  }, [data]);

  const lastIndex = bars.length - 1;

  return (
    <div className="card p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            {currencySymbol} {formatMoney(totalAmount)} across {totalReceipts} receipt
            {totalReceipts === 1 ? '' : 's'} in the last {bars.length} days
          </p>
        </div>
        <div className="flex rounded-md border border-line p-0.5">
          {[
            { key: 'chart', icon: BarChart3, label: 'Chart' },
            { key: 'table', icon: Table2, label: 'Table' },
          ].map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setView(option.key)}
              className={cn(
                'flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition',
                view === option.key ? 'bg-surface-sunken text-ink' : 'text-ink-subtle hover:text-ink'
              )}
              aria-pressed={view === option.key}
            >
              <option.icon size={13} />
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-44 items-end gap-1.5">
          {Array.from({ length: 14 }).map((_, index) => (
            <div key={index} className="skeleton flex-1" style={{ height: `${30 + ((index * 37) % 60)}%` }} />
          ))}
        </div>
      ) : !bars.length ? (
        <p className="flex h-44 items-center justify-center text-sm text-ink-subtle">No collection recorded yet.</p>
      ) : view === 'chart' ? (
        <div className="relative">
          {/* recessive reference lines */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-44">
            {[0, 0.5, 1].map((step) => (
              <div
                key={step}
                className="absolute inset-x-0 border-t border-dashed border-line"
                style={{ top: `${step * 100}%` }}
              >
                <span className="absolute -top-2 right-0 bg-surface pl-1 text-[0.6rem] tabular text-ink-subtle">
                  {formatCompact(max * (1 - step))}
                </span>
              </div>
            ))}
          </div>

          <div className="relative flex h-44 items-end gap-[2px]" role="img" aria-label={`${title} for the last ${bars.length} days`}>
            {bars.map((bar, index) => {
              const active = hover === index;
              return (
                <button
                  key={bar.day}
                  type="button"
                  onMouseEnter={() => setHover(index)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(index)}
                  onBlur={() => setHover(null)}
                  className="group relative flex h-full flex-1 items-end justify-center rounded-t focus:outline-none"
                  aria-label={`${formatDate(bar.day)}: ${currencySymbol} ${formatMoney(bar.amount)}, ${bar.receipts} receipts`}
                >
                  <span
                    className={cn(
                      'w-full rounded-t transition-all duration-200',
                      index === lastIndex ? 'bg-brand-600' : 'bg-brand-500/70',
                      active && 'bg-brand-700'
                    )}
                    style={{
                      height: `${Math.max(bar.amount > 0 ? 3 : 0.6, bar.ratio * 100)}%`,
                      borderTopLeftRadius: '4px',
                      borderTopRightRadius: '4px',
                    }}
                  />

                  {active ? (
                    <span className="pointer-events-none absolute bottom-full z-10 mb-2 w-max max-w-[11rem] -translate-x-0 rounded-md border border-line bg-surface px-2.5 py-1.5 text-left shadow-pop">
                      <span className="block text-[0.68rem] text-ink-subtle">{formatDate(bar.day)}</span>
                      <span className="block text-sm font-semibold tabular text-ink">
                        {currencySymbol} {formatMoney(bar.amount)}
                      </span>
                      <span className="block text-[0.68rem] text-ink-muted">
                        {bar.receipts} receipt{bar.receipts === 1 ? '' : 's'}
                      </span>
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex gap-[2px] text-[0.6rem] text-ink-subtle">
            {bars.map((bar, index) => (
              <span key={bar.day} className="flex-1 text-center">
                {index === 0 || index === lastIndex || index === Math.floor(lastIndex / 2)
                  ? formatDate(bar.day).slice(0, 5)
                  : ''}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="max-h-56 overflow-y-auto rounded-md border border-line">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface-raised text-xs uppercase tracking-wide text-ink-subtle">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Date</th>
                <th className="px-3 py-2 text-right font-semibold">Receipts</th>
                <th className="px-3 py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {[...bars].reverse().map((bar) => (
                <tr key={bar.day} className="border-t border-line">
                  <td className="px-3 py-1.5 text-ink">{formatDate(bar.day)}</td>
                  <td className="px-3 py-1.5 text-right tabular text-ink-muted">{bar.receipts}</td>
                  <td className="px-3 py-1.5 text-right tabular text-ink">
                    {currencySymbol} {formatMoney(bar.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default CollectionChart;
