import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FilePlus2, ReceiptText, Wallet, CalendarDays, FlaskConical, ArrowRight } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import { Card, CardHeader, StatCard, PageHeader } from '../../components/ui/Card.jsx';
import { Table } from '../../components/ui/Table.jsx';
import { StatusBadge } from '../../components/ui/Badge.jsx';
import CollectionChart from '../../components/dashboard/CollectionChart.jsx';
import { formatMoney } from '../../utils/currency.js';
import { formatDate, formatDateTime } from '../../utils/formatDate.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import { getDashboard } from '../../services/stats.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

function greeting() {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', hour: 'numeric', hour12: false }).format(new Date()));
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function StaffDashboard() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    getDashboard()
      .then((result) => active && setData(result))
      .catch((err) => active && setError(err))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const stats = data?.stats ?? {};

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${user?.fullName?.split(' ')[0] ?? ''}`}
        subtitle={`${settings.departmentName} · counter workspace`}
        actions={
          <Link to="/staff/receipts/create">
            <Button icon={FilePlus2}>New receipt</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Receipts today"
          value={stats.todayReceipts ?? 0}
          hint={formatDate(new Date())}
          icon={CalendarDays}
          loading={loading}
        />
        <StatCard
          label="Collected today"
          value={`${settings.currencySymbol} ${formatMoney(stats.todayCollected ?? 0, { decimals: 0 })}`}
          icon={Wallet}
          tone="success"
          loading={loading}
        />
        <StatCard
          label="Receipts issued by you"
          value={stats.totalReceipts ?? 0}
          hint="All time"
          icon={ReceiptText}
          tone="info"
          loading={loading}
          onClick={() => navigate('/staff/receipts')}
        />
        <StatCard
          label="Tests available"
          value={stats.activeTests ?? 0}
          hint="Prices set by the administrator"
          icon={FlaskConical}
          tone="warning"
          loading={loading}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CollectionChart
            data={data?.series ?? []}
            currencySymbol={settings.currencySymbol}
            loading={loading}
            title="Your daily collection"
          />
        </div>

        <Card className="flex flex-col justify-between">
          <div>
            <CardHeader icon={FilePlus2} title="Issue a receipt" subtitle="The fastest path through the counter queue." />
            <ol className="mt-4 space-y-3 text-sm text-ink-muted">
              {[
                'Enter the patient name, age and sex.',
                'Search and tick the required investigations.',
                'Generate - the serial number is assigned automatically.',
                'Print or hand over the PDF.',
              ].map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
          <Link to="/staff/receipts/create" className="mt-5 block">
            <Button fullWidth iconRight={ArrowRight}>
              Start a new receipt
            </Button>
          </Link>
        </Card>
      </div>

      <Card className="mt-5" padded={false}>
        <div className="flex items-center justify-between px-5 py-4">
          <CardHeader icon={ReceiptText} title="Recent receipts" subtitle="The last few you issued." />
          <Link to="/staff/receipts">
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
              key: 'createdAt',
              header: 'Issued',
              hideOnMobile: true,
              render: (row) => <span className="text-xs text-ink-muted">{formatDateTime(row.createdAt)}</span>,
            },
            {
              key: 'status',
              header: 'Status',
              hideOnMobile: true,
              render: (row) => <StatusBadge status={row.status} />,
            },
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
          skeletonRows={4}
          emptyTitle="No receipts yet"
          emptyMessage="Your first receipt will show up here."
          emptyAction={
            <Link to="/staff/receipts/create">
              <Button icon={FilePlus2}>Create a receipt</Button>
            </Link>
          }
          onRowClick={(row) => navigate(`/staff/receipts/${row.id}`)}
        />
      </Card>
    </div>
  );
}

export default StaffDashboard;
