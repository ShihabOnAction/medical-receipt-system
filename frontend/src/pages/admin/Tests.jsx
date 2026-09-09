import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Search, Plus, Pencil, Power, Trash2, FlaskConical, AlertTriangle } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import { Input, Select, Checkbox } from '../../components/ui/Field.jsx';
import { Card, PageHeader } from '../../components/ui/Card.jsx';
import { Table } from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { Modal, ConfirmDialog } from '../../components/ui/Modal.jsx';
import cn from '../../utils/cn.js';
import { formatMoney } from '../../utils/currency.js';
import { formatDateTime } from '../../utils/formatDate.js';
import { testSchema } from '../../utils/validation.js';
import useDebounce from '../../hooks/useDebounce.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { listTests, createTest, updateTest, deleteTest } from '../../services/tests.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

const CATEGORIES = [
  { value: 'EEG', label: 'EEG' },
  { value: 'EMG', label: 'EMG' },
  { value: 'NCS', label: 'NCS' },
  { value: 'EMG_NCS', label: 'EMG & NCS' },
  { value: 'DOPPLER', label: 'Doppler / Duplex' },
  { value: 'GENERAL', label: 'Other' },
];

const BLANK = { name: '', shortCode: '', category: 'GENERAL', price: '', isActive: true, displayOrder: '' };

export function AdminTests() {
  useDocumentTitle('Tests & prices');
  const toast = useToast();
  const { settings } = useSettings();

  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(true);

  const [editing, setEditing] = useState(null); // test object or 'new'
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null); // { type: 'toggle'|'delete', test }
  const [working, setWorking] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const {
    register,
    handleSubmit,
    reset,
    setError: setFieldError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(testSchema), defaultValues: BLANK });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTests(await listTests({ includeInactive: true }));
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return tests
      .filter((test) => (showInactive ? true : test.isActive))
      .filter(
        (test) =>
          !q ||
          test.name.toLowerCase().includes(q) ||
          (test.shortCode || '').toLowerCase().includes(q) ||
          (test.category || '').toLowerCase().includes(q)
      );
  }, [tests, debouncedSearch, showInactive]);

  const openNew = () => {
    reset({ ...BLANK, displayOrder: String((tests.at(-1)?.displayOrder ?? 0) + 10) });
    setEditing('new');
  };

  const openEdit = (test) => {
    reset({
      name: test.name,
      shortCode: test.shortCode || '',
      category: test.category || 'GENERAL',
      price: String(test.price),
      isActive: test.isActive,
      displayOrder: String(test.displayOrder ?? 0),
    });
    setEditing(test);
  };

  const submit = async (values) => {
    setSaving(true);
    const payload = {
      name: values.name,
      shortCode: values.shortCode || null,
      category: values.category || 'GENERAL',
      price: Number(values.price),
      isActive: values.isActive,
      displayOrder: values.displayOrder === '' ? 0 : Number(values.displayOrder),
    };

    try {
      const response = editing === 'new' ? await createTest(payload) : await updateTest(editing.id, payload);
      toast.success(response.message || 'Saved.');
      setEditing(null);
      load();
    } catch (err) {
      if (err.details && typeof err.details === 'object') {
        for (const [field, message] of Object.entries(err.details)) setFieldError(field, { type: 'server', message });
      }
      toast.error(err.message || 'Could not save the test.');
    } finally {
      setSaving(false);
    }
  };

  const runConfirm = async () => {
    if (!confirm) return;
    setWorking(true);
    try {
      const response =
        confirm.type === 'delete'
          ? await deleteTest(confirm.test.id)
          : await updateTest(confirm.test.id, { isActive: !confirm.test.isActive });
      toast.success(response.message || 'Updated.');
      setConfirm(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Could not update the test.');
    } finally {
      setWorking(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Investigation',
      render: (row) => (
        <div className="min-w-0">
          <p className={cn('truncate font-medium', row.isActive ? 'text-ink' : 'text-ink-subtle line-through')}>
            {row.name}
          </p>
          <p className="truncate text-xs text-ink-subtle">
            {row.shortCode ? `${row.shortCode} · ` : ''}
            order {row.displayOrder}
          </p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Group',
      hideOnMobile: true,
      render: (row) => <Badge tone="neutral">{CATEGORIES.find((c) => c.value === row.category)?.label || row.category}</Badge>,
    },
    {
      key: 'price',
      header: 'Price',
      headerClassName: 'text-right',
      className: 'text-right font-semibold tabular whitespace-nowrap',
      render: (row) => `${settings.currencySymbol} ${formatMoney(row.price)}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge tone={row.isActive ? 'success' : 'neutral'} dot>
          {row.isActive ? 'Active' : 'Disabled'}
        </Badge>
      ),
    },
    {
      key: 'updated',
      header: 'Updated',
      hideOnMobile: true,
      render: (row) => <span className="text-xs text-ink-muted">{formatDateTime(row.updatedAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right whitespace-nowrap',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost" title="Edit" onClick={() => openEdit(row)}>
            <Pencil size={15} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title={row.isActive ? 'Disable' : 'Enable'}
            onClick={() => setConfirm({ type: 'toggle', test: row })}
          >
            <Power size={15} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title="Delete"
            className="text-state-danger hover:bg-state-danger/10"
            onClick={() => setConfirm({ type: 'delete', test: row })}
          >
            <Trash2 size={15} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Tests & prices"
        subtitle="The price list every receipt is calculated from."
        actions={
          <Button icon={Plus} onClick={openNew}>
            Add test
          </Button>
        }
      />

      <Card className="mb-4" padded={false}>
        <div className="flex flex-wrap items-end gap-3 p-4">
          <div className="relative min-w-[14rem] flex-1">
            <label className="field-label" htmlFor="test-filter">
              Search
            </label>
            <Search size={16} className="pointer-events-none absolute left-3 top-[2.15rem] text-ink-subtle" />
            <input
              id="test-filter"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, code or group…"
              className="input-base pl-9"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 pb-2.5 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(event) => setShowInactive(event.target.checked)}
              className="h-4 w-4 rounded border-line-strong accent-brand-700"
            />
            Show disabled tests
          </label>
        </div>
      </Card>

      <Table
        columns={columns}
        rows={visible}
        loading={loading}
        error={error}
        skeletonRows={8}
        emptyTitle="No tests match"
        emptyMessage="Adjust the search, or add a new investigation."
        emptyAction={
          <Button icon={Plus} onClick={openNew}>
            Add test
          </Button>
        }
      />

      <div className="mt-3 flex items-start gap-1.5 text-xs text-ink-subtle">
        <AlertTriangle size={13} className="mt-0.5 shrink-0" />
        <p>
          Changing a price never touches receipts that are already issued - each receipt keeps the price it was printed
          with. A test used by past receipts is disabled rather than deleted.
        </p>
      </div>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Add investigation' : 'Edit investigation'}
        description={editing === 'new' ? 'It becomes selectable at the counter right away.' : editing?.name}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit(submit)} loading={saving} icon={FlaskConical}>
              {editing === 'new' ? 'Add test' : 'Save changes'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(submit)} className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Name"
            required
            className="sm:col-span-2"
            placeholder="NCS of All 4 Limbs"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input label="Short code" placeholder="NCS-4L" error={errors.shortCode?.message} {...register('shortCode')} />
          <Select label="Group" options={CATEGORIES} {...register('category')} />
          <Input
            label="Price"
            required
            inputMode="decimal"
            suffix={settings.currencySymbol}
            placeholder="2500"
            error={errors.price?.message}
            {...register('price')}
          />
          <Input
            label="Display order"
            inputMode="numeric"
            hint="Lower numbers come first."
            error={errors.displayOrder?.message}
            {...register('displayOrder')}
          />
          <div className="sm:col-span-2">
            <Checkbox
              label="Active"
              description="Inactive tests stay in history but cannot be added to new receipts."
              {...register('isActive')}
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirm}
        loading={working}
        variant={confirm?.type === 'delete' ? 'danger' : 'primary'}
        title={
          confirm?.type === 'delete'
            ? `Delete “${confirm?.test.name}”?`
            : confirm?.test.isActive
              ? `Disable “${confirm?.test.name}”?`
              : `Enable “${confirm?.test.name}”?`
        }
        confirmLabel={confirm?.type === 'delete' ? 'Delete' : confirm?.test.isActive ? 'Disable' : 'Enable'}
        message={
          confirm?.type === 'delete'
            ? 'If any receipt already uses this test it will be disabled instead of deleted, so history stays intact.'
            : confirm?.test.isActive
              ? 'It disappears from the counter immediately. Existing receipts are untouched.'
              : 'Staff will be able to select it again.'
        }
      />
    </div>
  );
}

export default AdminTests;
