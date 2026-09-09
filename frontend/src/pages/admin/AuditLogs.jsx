import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollText,
  UserPlus,
  UserCheck,
  UserX,
  ShieldAlert,
  ReceiptText,
  Printer,
  Ban,
  FlaskConical,
  Coins,
  Settings as SettingsIcon,
  LogIn,
  ChevronDown,
} from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import { Select } from '../../components/ui/Field.jsx';
import { Card, PageHeader } from '../../components/ui/Card.jsx';
import { Table, Pagination } from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';
import cn from '../../utils/cn.js';
import { formatDateTime, timeAgo, todayISO, daysAgoISO } from '../../utils/formatDate.js';
import { useToast } from '../../context/ToastContext.jsx';
import { listAuditLogs } from '../../services/audit.js';
import { userOptions } from '../../services/users.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

/** Icon + tone per action, so the log can be scanned rather than read. */
const ACTION_META = {
  USER_REGISTERED: { icon: UserPlus, tone: 'info', label: 'Registered' },
  USER_LOGGED_IN: { icon: LogIn, tone: 'neutral', label: 'Signed in' },
  USER_APPROVED: { icon: UserCheck, tone: 'success', label: 'Approved user' },
  USER_REJECTED: { icon: UserX, tone: 'danger', label: 'Rejected user' },
  USER_SUSPENDED: { icon: ShieldAlert, tone: 'danger', label: 'Suspended user' },
  USER_REACTIVATED: { icon: UserCheck, tone: 'info', label: 'Reactivated user' },
  USER_ROLE_CHANGED: { icon: ShieldAlert, tone: 'warning', label: 'Role changed' },
  PROFILE_UPDATED: { icon: UserCheck, tone: 'neutral', label: 'Profile updated' },
  RECEIPT_CREATED: { icon: ReceiptText, tone: 'success', label: 'Receipt created' },
  RECEIPT_PDF_GENERATED: { icon: Printer, tone: 'neutral', label: 'PDF generated' },
  RECEIPT_VOIDED: { icon: Ban, tone: 'danger', label: 'Receipt cancelled' },
  TEST_CREATED: { icon: FlaskConical, tone: 'info', label: 'Test added' },
  TEST_UPDATED: { icon: FlaskConical, tone: 'neutral', label: 'Test updated' },
  TEST_PRICE_CHANGED: { icon: Coins, tone: 'warning', label: 'Price changed' },
  TEST_DISABLED: { icon: FlaskConical, tone: 'danger', label: 'Test disabled' },
  TEST_ENABLED: { icon: FlaskConical, tone: 'success', label: 'Test enabled' },
  TEST_REORDERED: { icon: FlaskConical, tone: 'neutral', label: 'Tests reordered' },
  SETTINGS_UPDATED: { icon: SettingsIcon, tone: 'warning', label: 'Settings updated' },
  ADMIN_BOOTSTRAPPED: { icon: ShieldAlert, tone: 'warning', label: 'Admin bootstrapped' },
};

const RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '', label: 'All time' },
];

/** Renders the JSONB payload without dumping raw JSON on the page. */
function MetaSummary({ action, metadata }) {
  if (!metadata || typeof metadata !== 'object') return null;

  const parts = [];
  if (metadata.serial) parts.push(`Serial ${metadata.serial}`);
  if (metadata.patient) parts.push(metadata.patient);
  if (metadata.total !== undefined) parts.push(`Total ${metadata.total}`);
  if (metadata.name) parts.push(metadata.name);
  if (action === 'TEST_PRICE_CHANGED') parts.push(`${metadata.from} → ${metadata.to}`);
  if (action === 'USER_ROLE_CHANGED') parts.push(`${metadata.from} → ${metadata.to}`);
  if (metadata.email) parts.push(metadata.email);
  if (metadata.reason) parts.push(`“${metadata.reason}”`);
  if (Array.isArray(metadata.changed) && metadata.changed.length) parts.push(metadata.changed.join(', '));

  if (!parts.length) return null;
  return <span className="text-xs text-ink-muted">{parts.join(' · ')}</span>;
}

export function AdminAuditLogs() {
  useDocumentTitle('Audit log');
  const toast = useToast();

  const [filters, setFilters] = useState({ action: '', userId: '', range: '30' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [staff, setStaff] = useState([]);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    userOptions()
      .then(setStaff)
      .catch(() => {});
  }, []);

  const query = useMemo(
    () => ({
      page,
      pageSize: 30,
      action: filters.action,
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...(filters.range ? { from: daysAgoISO(Number(filters.range)), to: todayISO() } : {}),
    }),
    [page, filters]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await listAuditLogs(query));
      setError(null);
    } catch (err) {
      setError(err);
      toast.error(err.message || 'Could not load the audit log.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const columns = [
    {
      key: 'action',
      header: 'Event',
      render: (row) => {
        const meta = ACTION_META[row.action] || { icon: ScrollText, tone: 'neutral', label: row.action };
        return (
          <div className="flex items-start gap-2.5">
            <span
              className={cn(
                'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                meta.tone === 'success' && 'bg-state-success/10 text-state-success',
                meta.tone === 'danger' && 'bg-state-danger/10 text-state-danger',
                meta.tone === 'warning' && 'bg-state-warning/10 text-state-warning',
                meta.tone === 'info' && 'bg-state-info/10 text-state-info',
                meta.tone === 'neutral' && 'bg-surface-sunken text-ink-subtle'
              )}
            >
              <meta.icon size={14} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">{meta.label}</p>
              <MetaSummary action={row.action} metadata={row.metadata} />
            </div>
          </div>
        );
      },
    },
    {
      key: 'user',
      header: 'By',
      hideOnMobile: true,
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm text-ink">{row.userName || '—'}</p>
          <p className="truncate text-xs text-ink-subtle">{row.userEmail || ''}</p>
        </div>
      ),
    },
    {
      key: 'entity',
      header: 'Entity',
      hideOnMobile: true,
      render: (row) => (row.entityType ? <Badge tone="neutral">{row.entityType}</Badge> : '—'),
    },
    {
      key: 'when',
      header: 'When',
      className: 'whitespace-nowrap',
      render: (row) => (
        <span className="text-xs text-ink-muted" title={formatDateTime(row.createdAt)}>
          {timeAgo(row.createdAt)}
        </span>
      ),
    },
    {
      key: 'expand',
      header: '',
      className: 'text-right',
      render: (row) => (
        <Button
          size="icon"
          variant="ghost"
          title="Show details"
          onClick={() => setExpanded(expanded === row.id ? null : row.id)}
        >
          <ChevronDown size={15} className={cn('transition', expanded === row.id && 'rotate-180')} />
        </Button>
      ),
    },
  ];

  const actionOptions = [
    { value: '', label: 'All events' },
    ...(data?.actions ?? Object.keys(ACTION_META)).map((action) => ({
      value: action,
      label: ACTION_META[action]?.label || action,
    })),
  ];

  return (
    <div>
      <PageHeader title="Audit log" subtitle="Who did what, and when. Written automatically, never editable." />

      <Card className="mb-4" padded={false}>
        <div className="grid gap-3 p-4 sm:grid-cols-3">
          <Select
            label="Event"
            options={actionOptions}
            value={filters.action}
            onChange={(event) => setFilters((f) => ({ ...f, action: event.target.value }))}
          />
          <Select
            label="User"
            value={filters.userId}
            onChange={(event) => setFilters((f) => ({ ...f, userId: event.target.value }))}
            options={[{ value: '', label: 'Everyone' }, ...staff.map((u) => ({ value: u.id, label: u.fullName }))]}
          />
          <Select
            label="Period"
            options={RANGES}
            value={filters.range}
            onChange={(event) => setFilters((f) => ({ ...f, range: event.target.value }))}
          />
        </div>
      </Card>

      <Table
        columns={columns}
        rows={data?.items}
        loading={loading}
        error={error}
        skeletonRows={10}
        emptyTitle="Nothing logged for this filter"
        emptyMessage="Try a wider period or a different event."
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

      {expanded && data?.items ? (
        <Card className="mt-4">
          <p className="mb-2 text-sm font-semibold text-ink">Raw entry</p>
          <pre className="overflow-x-auto rounded-md bg-surface-sunken p-3 font-mono text-xs text-ink-muted">
            {JSON.stringify(data.items.find((item) => item.id === expanded), null, 2)}
          </pre>
        </Card>
      ) : null}
    </div>
  );
}

export default AdminAuditLogs;
