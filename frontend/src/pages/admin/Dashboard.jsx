import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  ReceiptText,
  Wallet,
  FlaskConical,
  CalendarDays,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import { Card, CardHeader, StatCard, PageHeader } from '../../components/ui/Card.jsx';
import { Table } from '../../components/ui/Table.jsx';
import { StatusBadge } from '../../components/ui/Badge.jsx';
import CollectionChart from '../../components/dashboard/CollectionChart.jsx';
import { formatMoney } from '../../utils/currency.js';
import { formatDate, formatDateTime, timeAgo } from '../../utils/formatDate.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { getDashboard } from '../../services/stats.js';
import { setUserStatus } from '../../services/users.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

export function AdminDashboard() {
  useDocumentTitle('Admin dashboard');
  const { settings } = useSettings();
  const toast = useToast();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [approving, setApproving] = useState(null);

  const load = () => {
    setLoading(true);
    getDashboard()
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const approve = async (user) => {
    setApproving(user.id);
    try {
      await setUserStatus(user.id, 'APPROVED');
      toast.success(`${user.fullName} can now issue receipts.`, 'Approved');
      load();
    } catch (err) {
      toast.error(err.message || 'Could not approve this user.');
    } finally {
      setApproving(null);
    }
  };

  const stats = data?.stats ?? {};

  return (
    <div>
      <PageHeader
        title="Administration"
        subtitle={`${settings.hospitalName} · ${settings.departmentName}`}
        actions={
          <Link to="/admin/settings">
            <Button variant="secondary" icon={ShieldCheck}>
              Hospital settings
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Collected today"
          value={`${settings.currencySymbol} ${formatMoney(stats.todayCollected ?? 0, { decimals: 0 })}`}
          hint={`${stats.todayReceipts ?? 0} receipts · ${formatDate(new Date())}`}
          icon={Wallet}
          tone="success"
          loading={loading}
        />
        <StatCard
          label="Total receipts"
          value={stats.totalReceipts ?? 0}
          hint={`${settings.currencySymbol} ${formatMoney(stats.totalCollected ?? 0, { decimals: 0 })} all time`}
          icon={ReceiptText}
          loading={loading}
          onClick={() => navigate('/admin/receipts')}
        />
        <StatCard
          label="Pending approvals"
          value={stats.pendingStaff ?? 0}
          hint={stats.pendingStaff ? 'Waiting for your decision' : 'Nothing waiting'}
          icon={UserPlus}
          tone={stats.pendingStaff ? 'warning' : 'brand'}
          loading={loading}
          onClick={() => navigate('/admin/users')}
        />
        <StatCard
          label="Active tests"
          value={stats.activeTests ?? 0}
          hint={`${stats.totalTests ?? 0} in the catalogue`}
          icon={FlaskConical}
          tone="info"
          loading={loading}
          onClick={() => navigate('/admin/tests')}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CollectionChart
            data={data?.series ?? []}
            currencySymbol={settings.currencySymbol}
            loading={loading}
            title="Department collection"
          />
        </div>

        <Card padded={false} className="flex flex-col">
          <div className="px-5 py-4">
            <CardHeader icon={Users} title="Waiting for approval" subtitle="New staff registrations." />
          </div>
          <div className="flex-1 border-t border-line">
            {loading ? (
              <div className="space-y-2 p-5">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="skeleton h-10 w-full" />
                ))}
              </div>
            ) : data?.pendingUsers?.length ? (
              <ul className="divide-y divide-line">
                {data.pendingUsers.map((user) => (
                  <li key={user.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{user.fullName}</p>
                      <p className="truncate text-xs text-ink-subtle">
                        {user.email} · {timeAgo(user.createdAt)}
                      </p>
                    </div>
                    <Button size="xs" loading={approving === user.id} onClick={() => approve(user)}>
                      Approve
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-10 text-center text-sm text-ink-subtle">No one is waiting.</p>
            )}
          </div>
          <Link to="/admin/users" className="border-t border-line px-5 py-3">
            <Button variant="ghost" size="sm" iconRight={ArrowRight} fullWidth>
              Manage staff &amp; access
            </Button>
          </Link>
        </Card>
      </div>

      <Card className="mt-5" padded={false}>
        <div className="flex items-center justify-between px-5 py-4">
          <CardHeader icon={CalendarDays} title="Latest receipts" subtitle="Across every counter." />
          <Link to="/admin/receipts">
            <Button variant="ghost" size="sm" iconRight={ArrowRight}>
              View all
            </Button>
          </Link>
        </div>
        <Table
          columns={[
            { key: 'serialDisplay', header: 'Serial', className: 'font-semibold tabular' },
            { key: 'patientName', header: 'Patient' },
            {
              key: 'createdByName',
              header: 'Issued by',
              hideOnMobile: true,
              render: (row) => <span className="text-xs text-ink-muted">{row.createdByName || '—'}</span>,
            },
            {
              key: 'createdAt',
              header: 'Issued',
              hideOnMobile: true,
              render: (row) => <span className="text-xs text-ink-muted">{formatDateTime(row.createdAt)}</span>,
            },
            { key: 'status', header: 'Status', hideOnMobile: true, render: (row) => <StatusBadge status={row.status} /> },
            {
              key: 'totalAmount',
              header: 'Amount',
              headerClassName: 'text-right',
              className: 'text-right font-semibold tabular',
              render: (row) => `${settings.currencySymbol} ${formatMoney(row.totalAmount)}`,
            },
          ]}
          rows={data?.recentReceipts}
          loading={loading}
          error={error}
          skeletonRows={5}
          emptyTitle="No receipts yet"
          emptyMessage="Receipts issued at the counter will appear here."
          onRowClick={(row) => navigate(`/admin/receipts/${row.id}`)}
        />
      </Card>
    </div>
  );
}

export default AdminDashboard;
