import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, X, Eye, Printer, Download, ReceiptText } from 'lucide-react';
import Button from '../ui/Button.jsx';
import { Select } from '../ui/Field.jsx';
import { Table, Pagination } from '../ui/Table.jsx';
import { StatusBadge } from '../ui/Badge.jsx';
import cn from '../../utils/cn.js';
import { formatMoney } from '../../utils/currency.js';
import { formatDate, formatDateTime } from '../../utils/formatDate.js';
import useDebounce from '../../hooks/useDebounce.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { listReceipts, downloadReceiptPdf, printReceipt } from '../../services/receipts.js';

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'amount_desc', label: 'Highest amount' },
  { value: 'amount_asc', label: 'Lowest amount' },
];

const STATUSES = [
  { value: 'ACTIVE', label: 'Active only' },
  { value: 'VOID', label: 'Cancelled only' },
  { value: 'ALL', label: 'All receipts' },
];

const EMPTY_FILTERS = { search: '', from: '', to: '', status: 'ACTIVE', sort: 'newest', createdBy: '' };

/**
 * Receipt list shared by the staff and admin pages. The API decides what is
 * visible: staff only ever receive their own rows.
 */
export function ReceiptListView({ basePath, showCreator = false, staffOptions = [] }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const navigate = useNavigate();
  const toast = useToast();
  const { settings } = useSettings();
  const debouncedSearch = useDebounce(filters.search, 350);

  const query = useMemo(
    () => ({
      page,
      pageSize: 20,
      search: debouncedSearch,
      from: filters.from,
      to: filters.to,
      status: filters.status,
      sort: filters.sort,
      ...(filters.createdBy ? { createdBy: filters.createdBy } : {}),
    }),
    [page, debouncedSearch, filters.from, filters.to, filters.status, filters.sort, filters.createdBy]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await listReceipts(query));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.from, filters.to, filters.status, filters.sort, filters.createdBy]);

  const activeFilterCount = [filters.from, filters.to, filters.createdBy].filter(Boolean).length +
    (filters.status !== 'ACTIVE' ? 1 : 0) +
    (filters.sort !== 'newest' ? 1 : 0);

  const quickAction = async (key, receipt, action, message) => {
    setBusyId(`${receipt.id}:${key}`);
    try {
      await action();
    } catch (err) {
      toast.error(err.message || message);
    } finally {
      setBusyId(null);
    }
  };

  const columns = [
    {
      key: 'serial',
      header: 'Serial',
      className: 'font-semibold tabular whitespace-nowrap',
      render: (row) => (
        <span className="flex items-center gap-2">
          {row.serialDisplay}
          {row.status === 'VOID' ? <StatusBadge status="VOID" /> : null}
        </span>
      ),
    },
    {
      key: 'patient',
      header: 'Patient',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{row.patientName}</p>
          <p className="truncate text-xs text-ink-subtle">
            {row.age ? `${row.age}${row.ageUnit === 'Y' ? 'y' : row.ageUnit.toLowerCase()}` : '—'} ·{' '}
            {row.sex === 'MALE' ? 'M' : row.sex === 'FEMALE' ? 'F' : 'O'}
            {row.refBy ? ` · Ref: ${row.refBy}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'tests',
      header: 'Tests',
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs text-ink-muted">
          {row.items?.length ? `${row.items.length} test${row.items.length === 1 ? '' : 's'}` : '—'}
        </span>
      ),
    },
    ...(showCreator
      ? [
          {
            key: 'creator',
            header: 'Issued by',
            hideOnMobile: true,
            render: (row) => <span className="text-xs text-ink-muted">{row.createdByName || '—'}</span>,
          },
        ]
      : []),
    {
      key: 'date',
      header: 'Date',
      hideOnMobile: true,
      className: 'whitespace-nowrap',
      render: (row) => (
        <span title={formatDateTime(row.createdAt)} className="text-xs text-ink-muted">
          {formatDate(row.receiptDate)}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Amount',
      headerClassName: 'text-right',
      className: 'text-right font-semibold tabular whitespace-nowrap',
      render: (row) => `${settings.currencySymbol} ${formatMoney(row.totalAmount)}`,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right whitespace-nowrap',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            size="icon"
            variant="ghost"
            title="Open"
            onClick={(event) => {
              event.stopPropagation();
              navigate(`${basePath}/${row.id}`);
            }}
          >
            <Eye size={16} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title="Print"
            loading={busyId === `${row.id}:print`}
            onClick={(event) => {
              event.stopPropagation();
              quickAction('print', row, () => printReceipt(row.id), 'Could not print.');
            }}
          >
            <Printer size={16} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title="Download PDF"
            loading={busyId === `${row.id}:pdf`}
            onClick={(event) => {
              event.stopPropagation();
              quickAction('pdf', row, () => downloadReceiptPdf(row.id, `receipt-${row.serialDisplay}.pdf`), 'Could not download.');
            }}
          >
            <Download size={16} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
          <input
            value={filters.search}
            onChange={(event) => setFilters((f) => ({ ...f, search: event.target.value }))}
            placeholder="Search serial number, patient or referring doctor…"
            className="input-base pl-9"
            aria-label="Search receipts"
          />
          {filters.search ? (
            <button
              type="button"
              onClick={() => setFilters((f) => ({ ...f, search: '' }))}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-subtle hover:bg-surface-sunken"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>

        <Button
          variant={showFilters ? 'subtle' : 'secondary'}
          icon={Filter}
          onClick={() => setShowFilters((v) => !v)}
        >
          Filters
          {activeFilterCount ? (
            <span className="ml-1 rounded-full bg-brand-700 px-1.5 text-[0.65rem] font-semibold text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </Button>
      </div>

      <div
        className={cn(
          'grid gap-3 overflow-hidden transition-all duration-200',
          showFilters ? 'mb-4 max-h-[30rem] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="grid gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="field-label" htmlFor="filter-from">
              From date
            </label>
            <input
              id="filter-from"
              type="date"
              value={filters.from}
              onChange={(event) => setFilters((f) => ({ ...f, from: event.target.value }))}
              className="input-base"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="filter-to">
              To date
            </label>
            <input
              id="filter-to"
              type="date"
              value={filters.to}
              onChange={(event) => setFilters((f) => ({ ...f, to: event.target.value }))}
              className="input-base"
            />
          </div>
          <Select
            label="Status"
            options={STATUSES}
            value={filters.status}
            onChange={(event) => setFilters((f) => ({ ...f, status: event.target.value }))}
          />
          <Select
            label="Sort by"
            options={SORTS}
            value={filters.sort}
            onChange={(event) => setFilters((f) => ({ ...f, sort: event.target.value }))}
          />
          {staffOptions.length ? (
            <Select
              label="Issued by"
              value={filters.createdBy}
              onChange={(event) => setFilters((f) => ({ ...f, createdBy: event.target.value }))}
              options={[{ value: '', label: 'Everyone' }, ...staffOptions.map((u) => ({ value: u.id, label: u.fullName }))]}
            />
          ) : null}
          <div className="flex items-end">
            <Button variant="ghost" icon={X} onClick={() => setFilters(EMPTY_FILTERS)}>
              Reset filters
            </Button>
          </div>
        </div>
      </div>

      <Table
        columns={columns}
        rows={data?.items}
        loading={loading}
        error={error}
        emptyTitle="No receipts found"
        emptyMessage={
          filters.search || activeFilterCount
            ? 'Try a different search term or clear the filters.'
            : 'Receipts you issue will appear here.'
        }
        emptyAction={
          filters.search || activeFilterCount ? (
            <Button variant="secondary" onClick={() => setFilters(EMPTY_FILTERS)}>
              Clear filters
            </Button>
          ) : (
            <Button icon={ReceiptText} onClick={() => navigate('/staff/receipts/create')}>
              Create the first receipt
            </Button>
          )
        }
        onRowClick={(row) => navigate(`${basePath}/${row.id}`)}
        footer={
          data ? (
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              pageSize={data.pageSize}
              onChange={setPage}
            />
          ) : null
        }
      />
    </div>
  );
}

export default ReceiptListView;
