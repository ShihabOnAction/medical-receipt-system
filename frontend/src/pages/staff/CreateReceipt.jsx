import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, FilePlus2, Eye, ArrowLeft } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import { Card, PageHeader } from '../../components/ui/Card.jsx';
import ReceiptForm from '../../components/receipt/ReceiptForm.jsx';
import ReceiptActions from '../../components/receipt/ReceiptActions.jsx';
import ReceiptPreview from '../../components/receipt/ReceiptPreview.jsx';
import { formatMoney } from '../../utils/currency.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

/** Shown straight after a receipt is issued, so the counter can act at once. */
function SuccessPanel({ receipt, onNew }) {
  const { settings } = useSettings();

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <Card className="lg:sticky lg:top-20">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-state-success/10 text-state-success">
              <CheckCircle2 size={24} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-ink">Receipt issued</h2>
              <p className="text-sm text-ink-muted">Hand the print-out to the patient.</p>
            </div>
          </div>

          <dl className="mt-5 space-y-3 border-y border-line py-4 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-subtle">Serial number</dt>
              <dd className="text-lg font-bold tabular text-brand-700 dark:text-brand-300">{receipt.serialDisplay}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-subtle">Patient</dt>
              <dd className="truncate font-medium text-ink">{receipt.patientName}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-subtle">Tests</dt>
              <dd className="font-medium text-ink">{receipt.items.length}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-subtle">Total</dt>
              <dd className="font-semibold tabular text-ink">
                {settings.currencySymbol} {formatMoney(receipt.totalAmount)}
              </dd>
            </div>
          </dl>

          <p className="mt-3 text-xs text-ink-subtle">In words: {receipt.amountInWords}</p>

          <div className="mt-5 space-y-2">
            <ReceiptActions receipt={receipt} />
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="subtle" icon={FilePlus2} onClick={onNew}>
                New receipt
              </Button>
              <Link to={`/staff/receipts/${receipt.id}`}>
                <Button variant="ghost" icon={Eye}>
                  Open record
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <ReceiptPreview receipt={receipt} />
      </div>
    </div>
  );
}

export function CreateReceipt() {
  useDocumentTitle('Create receipt');
  const [created, setCreated] = useState(null);
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader
        title={created ? 'Receipt created' : 'New money receipt'}
        subtitle={
          created
            ? 'Print it now, or start the next patient.'
            : 'Fill in the patient details and tick the required investigations.'
        }
        actions={
          <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/staff/dashboard')}>
            Back to dashboard
          </Button>
        }
      />

      {created ? (
        <SuccessPanel receipt={created} onNew={() => setCreated(null)} />
      ) : (
        <ReceiptForm onSuccess={setCreated} />
      )}
    </div>
  );
}

export default CreateReceipt;
