import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import cn from '../../utils/cn.js';
import Button from './Button.jsx';

/**
 * Data table with built-in loading, empty and error states, plus a card
 * layout on small screens so the same component works on a phone.
 *
 * columns: [{ key, header, render?, className?, headerClassName?, hideOnMobile? }]
 */
export function Table({
  columns,
  rows,
  loading = false,
  error = null,
  emptyTitle = 'Nothing here yet',
  emptyMessage,
  emptyAction,
  rowKey = (row) => row.id,
  onRowClick,
  skeletonRows = 6,
  footer,
}) {
  if (error) {
    return (
      <div className="rounded-lg border border-state-danger/30 bg-state-danger/5 p-6 text-center">
        <p className="text-sm font-medium text-state-danger">{error.message || 'Could not load this list.'}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="overflow-hidden rounded-lg border border-line">
        <table className="table-base">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={column.headerClassName}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: skeletonRows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((column) => (
                  <td key={column.key}>
                    <div className="skeleton h-4 w-full max-w-[10rem]" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!rows?.length) {
    return <EmptyState title={emptyTitle} message={emptyMessage} action={emptyAction} />;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(column.hideOnMobile && 'hidden md:table-cell', column.headerClassName)}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn('transition-colors', onRowClick && 'cursor-pointer')}
              >
                {columns.map((column) => (
                  <td key={column.key} className={cn(column.hideOnMobile && 'hidden md:table-cell', column.className)}>
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}

export function EmptyState({ title = 'Nothing here yet', message, action, icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line bg-surface px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-sunken text-ink-subtle">
        <Icon size={22} />
      </div>
      <p className="text-base font-semibold text-ink">{title}</p>
      {message ? <p className="mt-1 max-w-sm text-sm text-ink-muted">{message}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Pagination({ page, totalPages, total, pageSize, onChange, className }) {
  if (!totalPages || totalPages <= 1) {
    return total ? (
      <div className={cn('flex items-center justify-between border-t border-line px-4 py-3 text-sm text-ink-muted', className)}>
        <span>
          {total} record{total === 1 ? '' : 's'}
        </span>
      </div>
    ) : null;
  }

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-t border-line px-4 py-3 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <span>
        Showing <span className="font-medium text-ink">{first}</span>–<span className="font-medium text-ink">{last}</span>{' '}
        of <span className="font-medium text-ink">{total}</span>
      </span>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="secondary" icon={ChevronLeft} disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </Button>
        <span className="px-3 text-xs">
          Page {page} of {totalPages}
        </span>
        <Button
          size="sm"
          variant="secondary"
          iconRight={ChevronRight}
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default Table;
