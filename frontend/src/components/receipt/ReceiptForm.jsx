import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, CalendarClock, StickyNote, RotateCcw, Save } from 'lucide-react';
import Button from '../ui/Button.jsx';
import { Input, Select, Textarea } from '../ui/Field.jsx';
import { Card, CardHeader } from '../ui/Card.jsx';
import TestSelector from './TestSelector.jsx';
import { receiptSchema } from '../../utils/validation.js';
import { SEX_OPTIONS, AGE_UNITS, formatMoney } from '../../utils/currency.js';
import { todayISO } from '../../utils/formatDate.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { listTests } from '../../services/tests.js';
import { createReceipt } from '../../services/receipts.js';

const DEFAULTS = {
  patientName: '',
  age: '',
  ageUnit: 'Y',
  sex: 'MALE',
  refBy: '',
  opdWard: '',
  bedNumber: '',
  regNumber: '',
  receiptDate: todayISO(),
  reportDeliveryDate: '',
  reportDeliveryTime: '',
  bankOfficer: '',
  preparedBy: '',
  remarks: '',
};

/**
 * The counter form. Deliberately linear and keyboard friendly - the people
 * using it are working through a queue of patients.
 */
export function ReceiptForm({ onSuccess }) {
  const toast = useToast();
  const { settings } = useSettings();
  const { user } = useAuth();

  const [tests, setTests] = useState([]);
  const [testsLoading, setTestsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [testError, setTestError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(receiptSchema),
    defaultValues: { ...DEFAULTS, preparedBy: user?.fullName || '' },
  });

  const loadTests = async () => {
    setTestsLoading(true);
    try {
      setTests(await listTests());
    } catch (error) {
      toast.error(error.message || 'Could not load the test list.');
    } finally {
      setTestsLoading(false);
    }
  };

  useEffect(() => {
    loadTests();
    setFocus('patientName');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = useMemo(
    () => selectedIds.reduce((sum, id) => sum + Number(tests.find((t) => t.id === id)?.price || 0), 0),
    [selectedIds, tests]
  );

  const onSubmit = async (values) => {
    if (!selectedIds.length) {
      setTestError('Select at least one test.');
      document.getElementById('test-search')?.focus();
      return;
    }
    setTestError('');
    setSubmitting(true);

    try {
      const response = await createReceipt({
        ...values,
        age: values.age === '' ? null : Number(values.age),
        testIds: selectedIds,
        expectedTotal: total,
      });

      toast.success(`Receipt ${response.data.serialDisplay} issued for ${response.data.patientName}.`, 'Receipt created');
      reset({ ...DEFAULTS, preparedBy: user?.fullName || '' });
      setSelectedIds([]);
      onSuccess?.(response.data);
    } catch (error) {
      // A price changed between loading the form and submitting it.
      if (error.code === 'PRICE_CHANGED' || error.code === 'CONFLICT') {
        await loadTests();
        toast.warning(error.message, 'Prices refreshed');
      } else if (error.details && typeof error.details === 'object') {
        for (const [field, message] of Object.entries(error.details)) {
          setError(field, { type: 'server', message });
        }
        toast.error('Please correct the highlighted fields.');
      } else {
        toast.error(error.message || 'Could not create the receipt.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Card>
          <CardHeader icon={User} title="Patient details" subtitle="Exactly what goes on the printed receipt." />
          <div className="mt-5 grid gap-4 sm:grid-cols-6">
            <Input
              label="Patient's name"
              required
              placeholder="e.g. Al Amin"
              className="sm:col-span-6"
              error={errors.patientName?.message}
              {...register('patientName')}
            />

            <Input
              label="Age"
              inputMode="numeric"
              placeholder="23"
              className="sm:col-span-2"
              error={errors.age?.message}
              {...register('age')}
            />
            <Select label="Unit" options={AGE_UNITS} className="sm:col-span-2" {...register('ageUnit')} />
            <Select
              label="Sex"
              required
              options={SEX_OPTIONS}
              className="sm:col-span-2"
              error={errors.sex?.message}
              {...register('sex')}
            />

            <Input
              label="Referred by"
              placeholder="Dr. Mehedi Hasan"
              className="sm:col-span-4"
              error={errors.refBy?.message}
              {...register('refBy')}
            />
            <Input
              label="Receipt date"
              type="date"
              className="sm:col-span-2"
              error={errors.receiptDate?.message}
              {...register('receiptDate')}
            />

            {settings.showWardFields ? (
              <>
                <Input
                  label="OPD / Cabin / Ward"
                  placeholder="N-OPD"
                  className="sm:col-span-2"
                  error={errors.opdWard?.message}
                  {...register('opdWard')}
                />
                <Input
                  label="Bed"
                  className="sm:col-span-2"
                  error={errors.bedNumber?.message}
                  {...register('bedNumber')}
                />
                <Input
                  label="Registration no."
                  className="sm:col-span-2"
                  error={errors.regNumber?.message}
                  {...register('regNumber')}
                />
              </>
            ) : null}
          </div>
        </Card>

        <Card>
          <TestSelector
            tests={tests}
            value={selectedIds}
            onChange={(next) => {
              setSelectedIds(next);
              if (next.length) setTestError('');
            }}
            currencySymbol={settings.currencySymbol}
            error={testError}
            loading={testsLoading}
          />
        </Card>

        <Card>
          <CardHeader
            icon={CalendarClock}
            title="Delivery & signatures"
            subtitle="All optional - leave blank to print empty lines, as on the pad."
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Input label="Report delivery date" type="date" {...register('reportDeliveryDate')} error={errors.reportDeliveryDate?.message} />
            <Input label="Time" type="time" {...register('reportDeliveryTime')} error={errors.reportDeliveryTime?.message} />
            <Input label="Bank officer" placeholder="Leave blank to sign by hand" {...register('bankOfficer')} error={errors.bankOfficer?.message} />
            <Input label="Prepared by" {...register('preparedBy')} error={errors.preparedBy?.message} />
            <Textarea
              label="Internal remarks"
              hint="Kept in the record, never printed."
              className="sm:col-span-2"
              rows={2}
              {...register('remarks')}
            />
          </div>
        </Card>
      </div>

      {/* summary rail */}
      <div className="lg:col-span-1">
        <div className="lg:sticky lg:top-20">
          <Card className="overflow-hidden p-0">
            <div className="brand-gradient px-5 py-4 text-white">
              <p className="text-xs uppercase tracking-wide text-white/75">Amount payable</p>
              <p className="mt-1 text-3xl font-semibold tabular">
                {settings.currencySymbol} {formatMoney(total)}
              </p>
              <p className="mt-1 text-xs text-white/75">
                {selectedIds.length} test{selectedIds.length === 1 ? '' : 's'} selected
              </p>
            </div>

            <div className="space-y-3 p-5">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-subtle">Serial number</dt>
                  <dd className="font-medium text-ink">Assigned on save</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-subtle">Issued by</dt>
                  <dd className="truncate font-medium text-ink">{user?.fullName}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-subtle">Department</dt>
                  <dd className="truncate font-medium text-ink">{settings.departmentName}</dd>
                </div>
              </dl>

              <div className="rounded-md bg-surface-sunken p-3 text-xs text-ink-muted">
                <StickyNote size={13} className="mr-1 inline" />
                The serial number and the final amount are issued by the server, so two counters can work at the same
                time without ever clashing.
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <Button type="submit" size="lg" fullWidth icon={Save} loading={submitting}>
                  Generate receipt
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  icon={RotateCcw}
                  onClick={() => {
                    reset({ ...DEFAULTS, preparedBy: user?.fullName || '' });
                    setSelectedIds([]);
                    setTestError('');
                    setFocus('patientName');
                  }}
                >
                  Clear form
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
}

export default ReceiptForm;
