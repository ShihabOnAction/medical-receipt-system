import { useState } from 'react';
import { Printer, Download, FileText, Ban } from 'lucide-react';
import Button from '../ui/Button.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { downloadReceiptPdf, printReceipt, fetchReceiptPdf } from '../../services/receipts.js';

/** Print / view / download buttons shared by the details and success pages. */
export function ReceiptActions({ receipt, size = 'md', onVoid, canVoid = false, className }) {
  const toast = useToast();
  const [busy, setBusy] = useState(null);

  if (!receipt) return null;

  const run = async (key, action, errorMessage) => {
    setBusy(key);
    try {
      await action();
    } catch (error) {
      toast.error(error.message || errorMessage);
    } finally {
      setBusy(null);
    }
  };

  const openPdf = () =>
    run(
      'view',
      async () => {
        const blob = await fetchReceiptPdf(receipt.id);
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (!win) {
          URL.revokeObjectURL(url);
          throw new Error('Allow pop-ups for this site to open the PDF.');
        }
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      'Could not open the PDF.'
    );

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        <Button
          size={size}
          icon={Printer}
          loading={busy === 'print'}
          onClick={() => run('print', () => printReceipt(receipt.id), 'Could not print the receipt.')}
        >
          Print
        </Button>
        <Button size={size} variant="secondary" icon={FileText} loading={busy === 'view'} onClick={openPdf}>
          View PDF
        </Button>
        <Button
          size={size}
          variant="secondary"
          icon={Download}
          loading={busy === 'download'}
          onClick={() =>
            run(
              'download',
              () => downloadReceiptPdf(receipt.id, `receipt-${receipt.serialDisplay}.pdf`),
              'Could not download the PDF.'
            )
          }
        >
          Download
        </Button>
        {canVoid && receipt.status === 'ACTIVE' ? (
          <Button size={size} variant="ghost" icon={Ban} onClick={onVoid} className="text-state-danger hover:bg-state-danger/10">
            Cancel receipt
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default ReceiptActions;
