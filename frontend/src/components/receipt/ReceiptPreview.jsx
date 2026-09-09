import cn from '../../utils/cn.js';
import { formatMoney } from '../../utils/currency.js';
import { formatDate } from '../../utils/formatDate.js';
import { useSettings } from '../../context/SettingsContext.jsx';

const SEX_LABEL = { MALE: 'M', FEMALE: 'F', OTHER: 'O' };

/**
 * On-screen twin of the printed receipt. It deliberately keeps a paper look
 * in dark mode too - staff compare it against the physical pad.
 */
export function ReceiptPreview({ receipt, className }) {
  const { settings } = useSettings();
  if (!receipt) return null;

  const minRows = Number(settings.printTableRows) || 12;
  const fillers = Math.max(0, minRows - receipt.items.length);
  const currency = settings.currencySymbol || 'Tk.';
  const ageText = receipt.age === null || receipt.age === undefined ? '' : `${receipt.age} ${receipt.ageUnit || 'Y'}`;

  return (
    <div
      className={cn(
        'print-sheet relative mx-auto w-full max-w-[820px] rounded-lg border border-line bg-white p-6 text-slate-900 shadow-card sm:p-9',
        className
      )}
      style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}
    >
      {receipt.status === 'VOID' ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rotate-[-22deg] rounded border-8 border-rose-600/20 px-8 py-2 text-5xl font-extrabold tracking-[0.3em] text-rose-600/20">
            CANCELLED
          </span>
        </div>
      ) : null}

      {/* header */}
      <div className="flex items-start gap-3">
        <img src={settings.logoUrl || '/logo.png'} alt="" className="h-14 w-14 shrink-0 object-contain" />
        <div className="flex-1 text-center">
          {settings.hospitalNameBn ? <p className="text-sm font-bold">{settings.hospitalNameBn}</p> : null}
          <p className="text-xl font-bold" style={{ fontFamily: '"Times New Roman", Georgia, serif' }}>
            {settings.hospitalName}
          </p>
          <p className="text-xs">{settings.hospitalAddress}</p>
          <p className="text-sm font-bold tracking-wide">{settings.departmentName}</p>
        </div>
        <div className="min-w-[9rem] shrink-0 border border-slate-900 px-2 py-1 text-[0.65rem] leading-snug">
          {settings.showBankBox ? (
            <>
              <p className="text-xs font-bold">{settings.bankName}</p>
              <p>{settings.bankAccountLabel}</p>
              <p className="font-bold">{settings.bankAccountNumber}</p>
            </>
          ) : null}
          <p className="mt-1 border-t border-slate-900 pt-1">
            <span className="font-bold">Date:</span> {formatDate(receipt.receiptDate, { fallback: '' })}
          </p>
        </div>
      </div>

      {/* title strip */}
      <div className="mt-3 flex items-center gap-3">
        <p className="whitespace-nowrap text-sm font-bold">
          SL. No <span className="text-base tracking-widest">{receipt.serialDisplay}</span>
        </p>
        <p className="flex-1 border border-slate-900 bg-slate-200 px-2 py-0.5 text-center text-sm font-bold tracking-wide">
          {settings.receiptTitle}
        </p>
        <span className="w-16 shrink-0" />
      </div>

      {/* patient */}
      <div className="mt-3 space-y-2 text-sm">
        <div className="flex items-end gap-2">
          <span className="whitespace-nowrap">Patient&apos;s Name:</span>
          <span className="flex-1 border-b border-dotted border-slate-500 px-1 font-bold">{receipt.patientName}</span>
          <span>Age:</span>
          <span className="min-w-[3rem] border-b border-dotted border-slate-500 px-1 text-center font-bold">
            {ageText}
          </span>
          <span>Sex:</span>
          <span className="min-w-[2.5rem] border-b border-dotted border-slate-500 px-1 text-center font-bold">
            {SEX_LABEL[receipt.sex]}
          </span>
        </div>
        <div className="flex items-end gap-2">
          <span className="whitespace-nowrap">Ref. By:</span>
          <span className="flex-1 border-b border-dotted border-slate-500 px-1 font-bold">{receipt.refBy || ''}</span>
        </div>
        {settings.showWardFields ? (
          <div className="flex items-end gap-2">
            <span className="whitespace-nowrap">OPD/Cabin/Ward:</span>
            <span className="flex-1 border-b border-dotted border-slate-500 px-1 font-bold">{receipt.opdWard || ''}</span>
            <span>Bed:</span>
            <span className="min-w-[3rem] border-b border-dotted border-slate-500 px-1 text-center font-bold">
              {receipt.bedNumber || ''}
            </span>
            <span>Reg. No.:</span>
            <span className="min-w-[5rem] border-b border-dotted border-slate-500 px-1 font-bold">
              {receipt.regNumber || ''}
            </span>
          </div>
        ) : null}
      </div>

      {/* items */}
      <table className="mt-3 w-full table-fixed border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-12 border border-slate-900 px-1 py-1 text-center font-bold">No.</th>
            <th className="border border-slate-900 px-2 py-1 text-center font-bold">Description</th>
            <th className="w-24 border border-slate-900 px-2 py-1 text-center font-bold">{currency}</th>
          </tr>
        </thead>
        <tbody>
          {receipt.items.map((item, index) => (
            <tr key={item.id || index}>
              <td className="border border-slate-900 px-1 py-1 text-center tabular">
                {String(index + 1).padStart(2, '0')}
              </td>
              <td className="border border-slate-900 px-2 py-1">{item.testName}</td>
              <td className="border border-slate-900 px-2 py-1 text-right tabular">{formatMoney(item.lineTotal)}</td>
            </tr>
          ))}
          {Array.from({ length: fillers }).map((_, index) => (
            <tr key={`filler-${index}`}>
              <td className="border border-slate-900 px-1 py-1">&nbsp;</td>
              <td className="border border-slate-900 px-2 py-1">&nbsp;</td>
              <td className="border border-slate-900 px-2 py-1">&nbsp;</td>
            </tr>
          ))}
          <tr>
            <td className="border border-slate-900 px-2 py-1 text-right font-bold" colSpan={2}>
              Total {currency}:
            </td>
            <td className="border border-slate-900 px-2 py-1 text-right font-bold tabular">
              {formatMoney(receipt.totalAmount)}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="border border-t-0 border-slate-900 px-2 py-1 text-xs">
        <span className="font-bold">In Words:</span> {receipt.amountInWords}
      </div>

      {/* footer */}
      <div className="mt-4 flex gap-8 text-xs">
        <p className="flex-1">
          Report Delivery Date:{' '}
          <span className="inline-block min-w-[7rem] border-b border-dotted border-slate-500 px-1 font-bold">
            {formatDate(receipt.reportDeliveryDate, { fallback: '' })}
          </span>
        </p>
        <p className="flex-1">
          Time:{' '}
          <span className="inline-block min-w-[7rem] border-b border-dotted border-slate-500 px-1 font-bold">
            {receipt.reportDeliveryTime || ''}
          </span>
        </p>
      </div>

      <div className="mt-10 flex justify-between text-xs">
        <div className="w-44 text-center">
          <p className="min-h-[1rem] font-bold">{receipt.bankOfficer || ''}</p>
          <p className="border-t border-slate-900 pt-1 font-bold">Bank Officer</p>
        </div>
        <div className="w-44 text-center">
          <p className="min-h-[1rem] font-bold">{receipt.preparedBy || receipt.createdByName || ''}</p>
          <p className="border-t border-slate-900 pt-1 font-bold">Prepared By</p>
        </div>
      </div>

      {settings.footerNote ? <p className="mt-3 text-center text-[0.65rem]">{settings.footerNote}</p> : null}

      <div className="mt-2 flex justify-between text-[0.62rem] text-slate-500">
        <span>Issued: {formatDate(receipt.createdAt)}</span>
        <span>Ref: {receipt.serialDisplay}</span>
      </div>
    </div>
  );
}

export default ReceiptPreview;
