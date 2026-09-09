import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Landmark, Hash, Palette, Save, RotateCcw, Eye } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import { Input, Textarea, Switch } from '../../components/ui/Field.jsx';
import { Card, CardHeader, PageHeader } from '../../components/ui/Card.jsx';
import ColorField from '../../components/ui/ColorField.jsx';
import ReceiptPreview from '../../components/receipt/ReceiptPreview.jsx';
import cn from '../../utils/cn.js';
import { settingsSchema } from '../../utils/validation.js';
import { BRAND_PRESETS, applyBrandColors } from '../../utils/theme.js';
import { todayISO } from '../../utils/formatDate.js';
import SettingsContext, { useSettings } from '../../context/SettingsContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { updateSettings } from '../../services/settings.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

const TABS = [
  { key: 'identity', label: 'Hospital', icon: Building2 },
  { key: 'bank', label: 'Bank & receipt', icon: Landmark },
  { key: 'numbering', label: 'Numbering & print', icon: Hash },
  { key: 'appearance', label: 'Appearance', icon: Palette },
];

/** A stand-in receipt so the admin sees the effect of every change live. */
const SAMPLE = {
  id: 'sample',
  serialDisplay: '000018',
  receiptDate: todayISO(),
  patientName: 'Al Amin',
  age: 23,
  ageUnit: 'Y',
  sex: 'MALE',
  refBy: 'Dr. Mehedi Hasan',
  opdWard: 'N-OPD',
  bedNumber: '',
  regNumber: '',
  totalAmount: 5000,
  amountInWords: 'Five Thousand Only',
  reportDeliveryDate: null,
  reportDeliveryTime: '',
  bankOfficer: '',
  preparedBy: '',
  status: 'ACTIVE',
  createdAt: new Date().toISOString(),
  createdByName: 'Counter 1',
  items: [{ id: '1', testName: 'EMG & NCS of All 4 Limbs', unitPrice: 5000, lineTotal: 5000, lineNo: 1 }],
};

const toForm = (settings) => ({
  hospitalName: settings.hospitalName ?? '',
  hospitalNameBn: settings.hospitalNameBn ?? '',
  hospitalAddress: settings.hospitalAddress ?? '',
  departmentName: settings.departmentName ?? '',
  receiptTitle: settings.receiptTitle ?? '',
  logoUrl: settings.logoUrl ?? '',
  bankName: settings.bankName ?? '',
  bankAccountLabel: settings.bankAccountLabel ?? '',
  bankAccountNumber: settings.bankAccountNumber ?? '',
  currencySymbol: settings.currencySymbol ?? 'Tk.',
  currencyWord: settings.currencyWord ?? 'Taka',
  footerNote: settings.footerNote ?? '',
  serialPadding: String(settings.serialPadding ?? 6),
  serialPrefix: settings.serialPrefix ?? '',
  printTableRows: String(settings.printTableRows ?? 12),
  themePrimary: settings.themePrimary ?? '#0f766e',
  themeAccent: settings.themeAccent ?? '#0284c7',
  pdfFontFamily: settings.pdfFontFamily ?? 'Helvetica, Arial, sans-serif',
  pdfBaseFontSize: String(settings.pdfBaseFontSize ?? 12),
  showBankBox: Boolean(settings.showBankBox),
  showWardFields: Boolean(settings.showWardFields),
});

export function AdminSettings() {
  useDocumentTitle('Hospital settings');
  const { settings, applyLocal, refresh } = useSettings();
  const toast = useToast();

  const [tab, setTab] = useState('identity');
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm({ resolver: zodResolver(settingsSchema), defaultValues: toForm(settings) });

  useEffect(() => {
    reset(toForm(settings));
  }, [settings, reset]);

  const values = watch();

  // Live preview: the CSS variables follow the colour picker immediately.
  useEffect(() => {
    if (/^#[0-9a-fA-F]{6}$/.test(values.themePrimary || '')) {
      // persist:false - an unsaved preview must not survive a refresh.
      applyBrandColors({ primary: values.themePrimary, accent: values.themeAccent }, { persist: false });
    }
  }, [values.themePrimary, values.themeAccent]);

  // Restore the saved colours if the admin leaves without saving. The ref keeps
  // this to a genuine unmount - re-running it whenever `settings` changes would
  // undo the colours immediately after a successful save.
  const savedColors = useRef({ primary: settings.themePrimary, accent: settings.themeAccent });
  useEffect(() => {
    savedColors.current = { primary: settings.themePrimary, accent: settings.themeAccent };
  }, [settings.themePrimary, settings.themeAccent]);
  useEffect(() => () => applyBrandColors(savedColors.current, { persist: true }), []);

  const previewSettings = useMemo(
    () => ({
      ...settings,
      ...values,
      serialPadding: Number(values.serialPadding) || 6,
      printTableRows: Number(values.printTableRows) || 12,
    }),
    [settings, values]
  );

  const sample = useMemo(
    () => ({
      ...SAMPLE,
      serialDisplay: `${previewSettings.serialPrefix || ''}${'18'.padStart(Number(previewSettings.serialPadding) || 6, '0')}`,
    }),
    [previewSettings.serialPrefix, previewSettings.serialPadding]
  );

  const onSubmit = async (form) => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        serialPadding: Number(form.serialPadding),
        printTableRows: Number(form.printTableRows),
        pdfBaseFontSize: Number(form.pdfBaseFontSize),
      };
      const response = await updateSettings(payload);
      applyLocal(response.data);
      await refresh();
      toast.success('The receipt and the interface now use these settings.', 'Settings saved');
    } catch (error) {
      toast.error(error.message || 'Could not save the settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Hospital settings"
        subtitle="Everything printed on the receipt, and the colours of this interface."
        actions={
          <>
            <Button variant="ghost" icon={RotateCcw} onClick={() => reset(toForm(settings))} disabled={!isDirty || saving}>
              Discard
            </Button>
            <Button icon={Save} onClick={handleSubmit(onSubmit)} loading={saving}>
              Save changes
            </Button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg border border-line bg-surface p-1 no-scrollbar">
            {TABS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={cn(
                  'flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition',
                  tab === item.key
                    ? 'bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200'
                    : 'text-ink-muted hover:bg-surface-sunken hover:text-ink'
                )}
              >
                <item.icon size={15} />
                {item.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {tab === 'identity' ? (
              <Card>
                <CardHeader icon={Building2} title="Identity" subtitle="Printed at the top of every receipt." />
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Hospital name"
                    required
                    className="sm:col-span-2"
                    error={errors.hospitalName?.message}
                    {...register('hospitalName')}
                  />
                  <Input
                    label="Name in Bangla"
                    hint="Optional line above the English name."
                    className="sm:col-span-2"
                    error={errors.hospitalNameBn?.message}
                    {...register('hospitalNameBn')}
                  />
                  <Input label="Address" className="sm:col-span-2" error={errors.hospitalAddress?.message} {...register('hospitalAddress')} />
                  <Input label="Department" error={errors.departmentName?.message} {...register('departmentName')} />
                  <Input
                    label="Logo URL"
                    hint="A path such as /logo.png, or a full https:// address."
                    error={errors.logoUrl?.message}
                    {...register('logoUrl')}
                  />
                </div>
              </Card>
            ) : null}

            {tab === 'bank' ? (
              <Card>
                <CardHeader icon={Landmark} title="Bank & receipt wording" subtitle="The box in the top-right corner." />
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Input label="Receipt title" className="sm:col-span-2" error={errors.receiptTitle?.message} {...register('receiptTitle')} />
                  <Input label="Bank name" error={errors.bankName?.message} {...register('bankName')} />
                  <Input label="Account label" error={errors.bankAccountLabel?.message} {...register('bankAccountLabel')} />
                  <Input
                    label="Account number"
                    className="sm:col-span-2"
                    error={errors.bankAccountNumber?.message}
                    {...register('bankAccountNumber')}
                  />
                  <Input label="Currency symbol" hint="Shown in the table header." error={errors.currencySymbol?.message} {...register('currencySymbol')} />
                  <Input
                    label="Currency word"
                    hint="Used in the amount-in-words line."
                    error={errors.currencyWord?.message}
                    {...register('currencyWord')}
                  />
                  <Textarea
                    label="Footer note"
                    className="sm:col-span-2"
                    rows={2}
                    hint="Optional line at the bottom of the receipt."
                    {...register('footerNote')}
                  />

                  <div className="space-y-4 rounded-lg border border-line p-4 sm:col-span-2">
                    <Controller
                      control={control}
                      name="showBankBox"
                      render={({ field }) => (
                        <Switch
                          label="Show the bank box"
                          description="Turn off if the department does not collect through a bank counter."
                          checked={field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name="showWardFields"
                      render={({ field }) => (
                        <Switch
                          label="Show OPD / Ward / Bed / Reg. No."
                          description="These extra lines exist on the printed pad."
                          checked={field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />
                  </div>
                </div>
              </Card>
            ) : null}

            {tab === 'numbering' ? (
              <Card>
                <CardHeader icon={Hash} title="Numbering & print layout" subtitle="How serials look and how the page fills." />
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Serial digits"
                    inputMode="numeric"
                    hint="6 prints 000018. The next number itself always comes from the database."
                    error={errors.serialPadding?.message}
                    {...register('serialPadding')}
                  />
                  <Input
                    label="Serial prefix"
                    hint="Optional, e.g. NEU-"
                    error={errors.serialPrefix?.message}
                    {...register('serialPrefix')}
                  />
                  <Input
                    label="Minimum table rows"
                    inputMode="numeric"
                    hint="Empty rows keep the table the same height as the printed pad."
                    error={errors.printTableRows?.message}
                    {...register('printTableRows')}
                  />
                  <Input
                    label="PDF base font size"
                    inputMode="numeric"
                    suffix="px"
                    error={errors.pdfBaseFontSize?.message}
                    {...register('pdfBaseFontSize')}
                  />
                  <Input
                    label="PDF font stack"
                    className="sm:col-span-2"
                    hint="Any font available to the print engine, e.g. Helvetica, Arial, sans-serif."
                    error={errors.pdfFontFamily?.message}
                    {...register('pdfFontFamily')}
                  />
                </div>
              </Card>
            ) : null}

            {tab === 'appearance' ? (
              <Card>
                <CardHeader
                  icon={Palette}
                  title="Appearance"
                  subtitle="One colour drives the whole interface - the shades below are generated from it."
                />
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <Controller
                    control={control}
                    name="themePrimary"
                    render={({ field }) => (
                      <ColorField
                        label="Primary colour"
                        value={field.value}
                        onChange={field.onChange}
                        error={errors.themePrimary?.message}
                        presets={BRAND_PRESETS.map((preset) => ({ name: preset.name, value: preset.primary }))}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="themeAccent"
                    render={({ field }) => (
                      <ColorField
                        label="Accent colour"
                        value={field.value}
                        onChange={field.onChange}
                        error={errors.themeAccent?.message}
                        presets={BRAND_PRESETS.map((preset) => ({ name: preset.name, value: preset.accent }))}
                      />
                    )}
                  />
                </div>

                <div className="mt-5 rounded-lg border border-line p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium text-ink">Live preview</p>
                    <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[0.65rem] text-ink-subtle">
                      samples only
                    </span>
                  </div>

                  {/* Inert on purpose - these show the colours, they do not act. */}
                  <div className="pointer-events-none flex flex-wrap items-center gap-2" aria-hidden="true">
                    <Button size="sm" tabIndex={-1}>
                      Primary
                    </Button>
                    <Button size="sm" variant="secondary" tabIndex={-1}>
                      Secondary
                    </Button>
                    <Button size="sm" variant="subtle" tabIndex={-1}>
                      Subtle
                    </Button>
                    <Button size="sm" variant="outline" tabIndex={-1}>
                      Outline
                    </Button>
                    <span className="rounded-md brand-gradient px-3 py-1.5 text-xs font-medium text-white">Gradient</span>
                    <span className="rounded-full bg-accent-500 px-3 py-1.5 text-xs font-medium text-white">Accent</span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-md border border-line bg-surface p-3">
                      <p className="text-xs uppercase tracking-wide text-ink-subtle">Sidebar item</p>
                      <div className="mt-2 flex items-center gap-2 rounded-md bg-brand-50 px-2 py-1.5 text-sm font-medium text-brand-800 dark:bg-brand-900/40 dark:text-brand-200">
                        <span className="h-4 w-0.5 rounded-full bg-brand-600" />
                        Selected page
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-md border border-line">
                      <div className="brand-gradient px-3 py-2 text-white">
                        <p className="text-[0.65rem] uppercase tracking-wide text-white/75">Amount payable</p>
                        <p className="text-lg font-semibold tabular">{settings.currencySymbol} 3,700.00</p>
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-ink-subtle">
                    Colours apply to this session immediately and to everyone once you save. Each staff member can still
                    pick light or dark mode and their own row density.
                  </p>
                </div>
              </Card>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => reset(toForm(settings))} disabled={!isDirty || saving} type="button">
                Discard changes
              </Button>
              <Button type="submit" icon={Save} loading={saving}>
                Save changes
              </Button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-20">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-ink-muted">
              <Eye size={15} /> Receipt preview
            </div>
            <div className="origin-top scale-[0.92]">
              <SettingsPreview settings={previewSettings} receipt={sample} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Renders the preview against the unsaved form values rather than the saved
 * ones, by re-providing the settings context for this subtree only.
 */
function SettingsPreview({ settings, receipt }) {
  const context = useSettings();
  const patched = useMemo(() => ({ ...context, settings }), [context, settings]);

  return (
    <SettingsContext.Provider value={patched}>
      <ReceiptPreview receipt={receipt} />
    </SettingsContext.Provider>
  );
}

export default AdminSettings;
