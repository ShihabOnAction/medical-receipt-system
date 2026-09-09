import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Check, X, Ban, RotateCcw, ShieldCheck, UserCog, Mail, Phone } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import { Select, Textarea } from '../../components/ui/Field.jsx';
import { Card, PageHeader } from '../../components/ui/Card.jsx';
import { Table, Pagination } from '../../components/ui/Table.jsx';
import { StatusBadge, RoleBadge } from '../../components/ui/Badge.jsx';
import { ConfirmDialog } from '../../components/ui/Modal.jsx';
import { formatDateTime, timeAgo } from '../../utils/formatDate.js';
import useDebounce from '../../hooks/useDebounce.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../context/ToastContext.jsx';
import { listUsers, setUserStatus, setUserRole } from '../../services/users.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'REJECTED', label: 'Rejected' },
];

const ROLE_FILTERS = [
  { value: 'ALL', label: 'All roles' },
  { value: 'ADMIN', label: 'Administrators' },
  { value: 'STAFF', label: 'Staff' },
];

/** Every entry here describes an irreversible-feeling action, so each is confirmed. */
const ACTIONS = {
  APPROVED: { label: 'Approve', icon: Check, variant: 'success', title: 'Approve this account?', message: 'They will be able to sign in and issue receipts immediately.' },
  REJECTED: { label: 'Reject', icon: X, variant: 'danger', title: 'Reject this registration?', message: 'They will not be able to use the system. You can approve them later.' },
  SUSPENDED: { label: 'Suspend', icon: Ban, variant: 'danger', title: 'Suspend this account?', message: 'They stay in the records but cannot sign in or issue receipts.' },
  PENDING: { label: 'Move to pending', icon: RotateCcw, variant: 'primary', title: 'Move back to pending?', message: 'The account will need approval again before it can be used.' },
};

export function AdminUsers() {
  useDocumentTitle('Staff & access');
  const toast = useToast();
  const { user: currentUser } = useAuth();

  const [filters, setFilters] = useState({ search: '', status: 'ALL', role: 'ALL' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [pending, setPending] = useState(null); // { user, status } | { user, role }
  const [reason, setReason] = useState('');
  const [working, setWorking] = useState(false);

  const debouncedSearch = useDebounce(filters.search, 350);

  const query = useMemo(
    () => ({ page, pageSize: 20, search: debouncedSearch, status: filters.status, role: filters.role }),
    [page, debouncedSearch, filters.status, filters.role]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await listUsers(query));
      setError(null);
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
  }, [debouncedSearch, filters.status, filters.role]);

  const apply = async () => {
    if (!pending) return;
    setWorking(true);
    try {
      const response = pending.role
        ? await setUserRole(pending.user.id, pending.role)
        : await setUserStatus(pending.user.id, pending.status, reason);
      toast.success(response.message || 'Updated.');
      setPending(null);
      setReason('');
      load();
    } catch (err) {
      toast.error(err.message || 'Could not update this user.');
    } finally {
      setWorking(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Staff member',
      render: (row) => (
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate font-medium text-ink">
            {row.fullName}
            {row.id === currentUser?.id ? <span className="text-xs font-normal text-ink-subtle">(you)</span> : null}
          </p>
          <p className="flex items-center gap-2 truncate text-xs text-ink-subtle">
            <Mail size={11} /> {row.email}
            {row.phone ? (
              <>
                <Phone size={11} /> {row.phone}
              </>
            ) : null}
          </p>
        </div>
      ),
    },
    {
      key: 'designation',
      header: 'Designation',
      hideOnMobile: true,
      render: (row) => <span className="text-sm text-ink-muted">{row.designation || '—'}</span>,
    },
    { key: 'role', header: 'Role', render: (row) => <RoleBadge role={row.role} /> },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'joined',
      header: 'Registered',
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs text-ink-muted" title={formatDateTime(row.createdAt)}>
          {timeAgo(row.createdAt)}
        </span>
      ),
    },
    {
      key: 'lastLogin',
      header: 'Last sign-in',
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs text-ink-muted">{row.lastLoginAt ? timeAgo(row.lastLoginAt) : 'Never'}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right whitespace-nowrap',
      render: (row) => {
        if (row.id === currentUser?.id) return <span className="text-xs text-ink-subtle">—</span>;

        const buttons = [];
        if (row.status === 'PENDING') {
          buttons.push(['APPROVED', 'success'], ['REJECTED', 'ghost']);
        } else if (row.status === 'APPROVED') {
          buttons.push(['SUSPENDED', 'ghost']);
        } else {
          buttons.push(['APPROVED', 'success']);
        }

        return (
          <div className="flex justify-end gap-1">
            {buttons.map(([status, variant]) => {
              const action = ACTIONS[status];
              return (
                <Button
                  key={status}
                  size="xs"
                  variant={variant}
                  icon={action.icon}
                  onClick={() => setPending({ user: row, status })}
                  className={variant === 'ghost' ? 'text-state-danger hover:bg-state-danger/10' : undefined}
                >
                  {action.label}
                </Button>
              );
            })}
            <Button
              size="xs"
              variant="ghost"
              icon={UserCog}
              title={row.role === 'ADMIN' ? 'Make staff' : 'Make administrator'}
              onClick={() => setPending({ user: row, role: row.role === 'ADMIN' ? 'STAFF' : 'ADMIN' })}
            >
              {row.role === 'ADMIN' ? 'Demote' : 'Promote'}
            </Button>
          </div>
        );
      },
    },
  ];

  const dialog = pending?.role
    ? {
        title: pending.role === 'ADMIN' ? 'Make this user an administrator?' : 'Move this user back to staff?',
        message:
          pending.role === 'ADMIN'
            ? 'Administrators can change prices, approve accounts and cancel receipts.'
            : 'They will keep issuing receipts but lose every administrative screen.',
        confirmLabel: pending.role === 'ADMIN' ? 'Promote' : 'Demote',
        variant: pending.role === 'ADMIN' ? 'primary' : 'danger',
      }
    : pending
      ? { ...ACTIONS[pending.status], confirmLabel: ACTIONS[pending.status].label }
      : {};

  return (
    <div>
      <PageHeader
        title="Staff & access"
        subtitle="Approve new registrations and control who can issue receipts."
      />

      <Card className="mb-4" padded={false}>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <label className="field-label" htmlFor="user-search">
              Search
            </label>
            <Search size={16} className="pointer-events-none absolute left-3 top-[2.15rem] text-ink-subtle" />
            <input
              id="user-search"
              value={filters.search}
              onChange={(event) => setFilters((f) => ({ ...f, search: event.target.value }))}
              placeholder="Name or e-mail…"
              className="input-base pl-9"
            />
          </div>
          <Select
            label="Status"
            options={STATUS_FILTERS}
            value={filters.status}
            onChange={(event) => setFilters((f) => ({ ...f, status: event.target.value }))}
          />
          <Select
            label="Role"
            options={ROLE_FILTERS}
            value={filters.role}
            onChange={(event) => setFilters((f) => ({ ...f, role: event.target.value }))}
          />
        </div>
      </Card>

      <Table
        columns={columns}
        rows={data?.items}
        loading={loading}
        error={error}
        emptyTitle="No staff found"
        emptyMessage="Nobody matches these filters yet."
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

      <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-subtle">
        <ShieldCheck size={13} />
        Every approval, rejection and role change is written to the audit log.
      </p>

      <ConfirmDialog
        open={Boolean(pending)}
        onClose={() => {
          setPending(null);
          setReason('');
        }}
        onConfirm={apply}
        loading={working}
        title={dialog.title}
        message={pending ? `${pending.user.fullName} — ${dialog.message}` : ''}
        confirmLabel={dialog.confirmLabel}
        variant={dialog.variant === 'success' ? 'primary' : dialog.variant}
      >
        {pending && !pending.role && pending.status !== 'APPROVED' ? (
          <Textarea
            className="mt-3"
            label="Reason (optional)"
            rows={2}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Kept in the audit log"
          />
        ) : null}
      </ConfirmDialog>
    </div>
  );
}

export default AdminUsers;
