import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, User, Clock, Ban, AlertTriangle } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import { Card, CardHeader, PageHeader, PageLoader } from '../components/ui/Card.jsx';
import { StatusBadge } from '../components/ui/Badge.jsx';
import { ConfirmDialog } from '../components/ui/Modal.jsx';
import { Textarea } from '../components/ui/Field.jsx';
import { EmptyState } from '../components/ui/Table.jsx';
import ReceiptPreview from '../components/receipt/ReceiptPreview.jsx';
import ReceiptActions from '../components/receipt/ReceiptActions.jsx';
import { formatMoney } from '../utils/currency.js';
import { formatDate, formatDateTime } from '../utils/formatDate.js';
import { useAuth } from '../hooks/useAuth.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { getReceipt, voidReceipt } from '../services/receipts.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';

export function ReceiptDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { settings } = useSettings();
  const toast = useToast();

  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [voidOpen, setVoidOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  useDocumentTitle(receipt ? `Receipt ${receipt.serialDisplay}` : 'Receipt');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReceipt(await getReceipt(id));
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmVoid = async () => {
    if (reason.trim().length < 5) {
      toast.error('Give a reason of at least 5 characters.');
      return;
    }
    setVoiding(true);
    try {
      const response = await voidReceipt(id, reason.trim());
      setReceipt(response.data);
      setVoidOpen(false);
      setReason('');
      toast.success(response.message || 'Receipt cancelled.');
    } catch (err) {
      toast.error(err.message || 'Could not cancel the receipt.');
    } finally {
      setVoiding(false);
    }
  };

  if (loading) return <PageLoader label="Loading receipt…" />;

  if (error || !receipt) {
    return (
      <div>
        <PageHeader
          title="Receipt"
          actions={
            <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate(-1)}>
              Back
            </Button>
          }
        />
        <EmptyState
          icon={AlertTriangle}
          title="Receipt unavailable"
          message={error?.message || 'This receipt does not exist, or it belongs to another user.'}
          action={<Button onClick={() => navigate(isAdmin ? '/admin/receipts' : '/staff/receipts')}>Back to list</Button>}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        breadcrumb={isAdmin ? 'Admin · Receipts' : 'My receipts'}
        title={
          <span className="flex items-center gap-3">
            Receipt {receipt.serialDisplay}
            <StatusBadge status={receipt.status} />
          </span>
        }
        subtitle={`${receipt.patientName} · ${settings.currencySymbol} ${formatMoney(receipt.totalAmount)}`}
        actions={
          <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate(-1)}>
            Back
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-1">
          <Card>
            <CardHeader icon={User} title="Record" subtitle="Stored exactly as issued." />
            <dl className="mt-4 space-y-2.5 text-sm">
              {[
                ['Serial number', receipt.serialDisplay],
                ['Receipt date', formatDate(receipt.receiptDate)],
                ['Patient', receipt.patientName],
                ['Age / Sex', `${receipt.age ?? '—'}${receipt.age ? ` ${receipt.ageUnit}` : ''} · ${receipt.sex}`],
                ['Referred by', receipt.refBy || '—'],
                ...(settings.showWardFields
                  ? [
                      ['OPD / Ward', receipt.opdWard || '—'],
                      ['Bed', receipt.bedNumber || '—'],
                      ['Registration no.', receipt.regNumber || '—'],
                    ]
                  : []),
                ['Report delivery', formatDate(receipt.reportDeliveryDate, { fallback: '—' })],
                ['Delivery time', receipt.reportDeliveryTime || '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="shrink-0 text-ink-subtle">{label}</dt>
                  <dd className="truncate text-right font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>

            {receipt.remarks ? (
              <p className="mt-4 rounded-md bg-surface-sunken p-3 text-xs text-ink-muted">
                <b>Remarks:</b> {receipt.remarks}
              </p>
            ) : null}
          </Card>

          <Card>
            <CardHeader icon={Clock} title="Trail" />
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-subtle">Issued by</dt>
                <dd className="truncate text-right font-medium text-ink">{receipt.createdByName || '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-subtle">Issued at</dt>
                <dd className="text-right font-medium text-ink">{formatDateTime(receipt.createdAt)}</dd>
              </div>
              {receipt.status === 'VOID' ? (
                <>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-subtle">Cancelled at</dt>
                    <dd className="text-right font-medium text-state-danger">{formatDateTime(receipt.voidedAt)}</dd>
                  </div>
                  <div className="rounded-md bg-state-danger/10 p-3 text-xs text-state-danger">
                    <b>Reason:</b> {receipt.voidReason}
                  </div>
                </>
              ) : null}
            </dl>
          </Card>

          <Card>
            <ReceiptActions receipt={receipt} canVoid={isAdmin} onVoid={() => setVoidOpen(true)} />
            {!isAdmin && receipt.status === 'ACTIVE' ? (
              <p className="mt-3 text-xs text-ink-subtle">
                A receipt cannot be edited once issued. Ask an administrator to cancel it if something is wrong.
              </p>
            ) : null}
          </Card>
        </div>

        <div className="lg:col-span-2">
          <ReceiptPreview receipt={receipt} />
        </div>
      </div>

      <ConfirmDialog
        open={voidOpen}
        onClose={() => setVoidOpen(false)}
        onConfirm={confirmVoid}
        loading={voiding}
        title={`Cancel receipt ${receipt.serialDisplay}?`}
        confirmLabel="Cancel receipt"
        message="The record and its serial number are kept forever - it is marked cancelled and stamped on the print-out. This cannot be undone."
      >
        <Textarea
          className="mt-3"
          label="Reason"
          required
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="e.g. Wrong patient name, replaced by receipt 000131"
        />
        <p className="mt-2 flex items-start gap-1.5 text-xs text-ink-subtle">
          <Ban size={13} className="mt-0.5 shrink-0" />
          The reason is written to the audit log against your name.
        </p>
      </ConfirmDialog>
    </div>
  );
}

export default ReceiptDetails;
