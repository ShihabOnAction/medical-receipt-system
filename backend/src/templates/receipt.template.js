import { escapeHtml, formatMoney, formatDate, SEX_LABEL } from '../utils/formatter.js';

/**
 * The print stylesheet is generated from the settings row, so the hospital
 * can retune the receipt (fonts, colours, row count, which boxes appear)
 * without a code change.
 */
function buildCss(settings) {
  const base = Number(settings.pdf_base_font_size) || 12;
  const font = settings.pdf_font_family || 'Helvetica, Arial, sans-serif';
  const primary = settings.theme_primary || '#0f766e';

  return `
    @page { size: A4 portrait; margin: 12mm 12mm 10mm 12mm; }

    :root {
      --font: ${font};
      --fs: ${base}px;
      --fs-sm: ${(base - 1.5).toFixed(1)}px;
      --fs-xs: ${(base - 2.5).toFixed(1)}px;
      --fs-lg: ${(base + 5).toFixed(1)}px;
      --fs-xl: ${(base + 8).toFixed(1)}px;
      --ink: #000;
      --muted: #333;
      --rule: #000;
      --primary: ${primary};
      --row-h: ${base + 8}px;
    }

    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: var(--font);
      font-size: var(--fs);
      color: var(--ink);
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .sheet { position: relative; width: 100%; }

    /* ---------- header ---------- */
    .head { display: flex; align-items: flex-start; gap: 10px; }
    .head__logo { width: 62px; flex: 0 0 62px; padding-top: 2px; }
    .head__logo img { width: 100%; display: block; }
    .head__main { flex: 1; text-align: center; padding: 0 4px; }
    .head__bn { font-size: var(--fs); font-weight: 700; margin-bottom: 1px; }
    .head__name { font-size: var(--fs-xl); font-weight: 700; letter-spacing: .2px; font-family: "Times New Roman", Georgia, serif; }
    .head__address { font-size: var(--fs-sm); margin-top: 1px; }
    .head__dept { font-size: var(--fs); font-weight: 700; margin-top: 2px; letter-spacing: .3px; }
    .head__bank {
      flex: 0 0 auto; min-width: 148px; border: 1px solid var(--rule);
      padding: 4px 7px; font-size: var(--fs-xs); line-height: 1.45; text-align: left;
    }
    .head__bank b { font-size: var(--fs-sm); }
    .head__bank-date { border-top: 1px solid var(--rule); margin-top: 3px; padding-top: 3px; }

    /* ---------- title strip ---------- */
    .titlebar { display: flex; align-items: center; gap: 12px; margin-top: 10px; }
    .serial { font-weight: 700; font-size: var(--fs); white-space: nowrap; }
    .serial span { font-size: var(--fs-lg); letter-spacing: 1px; }
    .title {
      flex: 1; text-align: center; font-weight: 700; letter-spacing: .6px;
      border: 1px solid var(--rule); background: #e9e9e9; padding: 3px 8px; font-size: var(--fs);
    }
    .titlebar__spacer { flex: 0 0 90px; }

    /* ---------- patient block ---------- */
    .patient { margin-top: 10px; font-size: var(--fs); }
    .prow { display: flex; align-items: flex-end; gap: 6px; margin-bottom: 7px; }
    .plabel { white-space: nowrap; }
    .pvalue {
      flex: 1; border-bottom: 1px dotted #444; padding: 0 4px 1px;
      font-weight: 700; min-height: 15px;
    }
    .pvalue--fixed { flex: 0 0 auto; min-width: 46px; text-align: center; }
    /* Keeps Age/Sex around two-thirds across, as on the printed pad, instead of
       being pushed flush to the right margin by a long name. */
    .pvalue--name { flex: 1 1 auto; max-width: 58%; }

    /* ---------- items table ---------- */
    table.items { width: 100%; border-collapse: collapse; margin-top: 9px; table-layout: fixed; }
    table.items th, table.items td { border: 1px solid var(--rule); padding: 3px 6px; }
    table.items thead th { text-align: center; font-weight: 700; font-size: var(--fs); }
    .col-no { width: 42px; text-align: center; }
    .col-amt { width: 92px; text-align: right; }
    table.items td.col-no { text-align: center; }
    table.items td.col-amt { text-align: right; font-variant-numeric: tabular-nums; }
    table.items tbody td { height: var(--row-h); vertical-align: top; }
    tr.filler td { height: var(--row-h); }
    tr.total td { font-weight: 700; }
    .total__label { text-align: right; }

    .words { border: 1px solid var(--rule); border-top: 0; padding: 4px 6px; font-size: var(--fs-sm); }
    .words b { font-weight: 700; }

    /* ---------- footer ---------- */
    .foot { margin-top: 12px; display: flex; gap: 24px; font-size: var(--fs-sm); }
    .foot__field { flex: 1; }
    .foot__field .line { border-bottom: 1px dotted #444; display: inline-block; min-width: 110px; padding: 0 4px; font-weight: 700; }

    .signs { margin-top: 38px; display: flex; justify-content: space-around; }
    .sign { width: 190px; text-align: center; }
    .sign__value { min-height: 16px; font-weight: 700; font-size: var(--fs-sm); }
    .sign__line { border-top: 1px solid var(--rule); margin-top: 2px; padding-top: 3px; font-size: var(--fs-sm); font-weight: 700; }

    .note { margin-top: 10px; font-size: var(--fs-xs); color: var(--muted); text-align: center; }
    .meta { margin-top: 16px; font-size: var(--fs-xs); color: #666; display: flex; justify-content: space-between; }

    /* ---------- cancelled stamp ---------- */
    .void {
      position: absolute; top: 45%; left: 50%; transform: translate(-50%, -50%) rotate(-22deg);
      font-size: 78px; font-weight: 800; color: rgba(190, 18, 60, .18);
      border: 8px solid rgba(190, 18, 60, .18); padding: 6px 28px; letter-spacing: 6px;
    }
  `;
}

function bankBox(settings, receipt) {
  if (!settings.show_bank_box) {
    return `<div class="head__bank"><div class="head__bank-date"><b>Date:</b> ${escapeHtml(
      formatDate(receipt.receiptDate)
    )}</div></div>`;
  }
  return `
    <div class="head__bank">
      <b>${escapeHtml(settings.bank_name)}</b><br />
      ${escapeHtml(settings.bank_account_label)}<br />
      <b>${escapeHtml(settings.bank_account_number)}</b>
      <div class="head__bank-date"><b>Date:</b> ${escapeHtml(formatDate(receipt.receiptDate))}</div>
    </div>`;
}

function wardRow(settings, receipt) {
  if (!settings.show_ward_fields) return '';
  return `
    <div class="prow">
      <span class="plabel">OPD/Cabin/Ward:</span>
      <span class="pvalue">${escapeHtml(receipt.opdWard || '')}</span>
      <span class="plabel">Bed:</span>
      <span class="pvalue pvalue--fixed">${escapeHtml(receipt.bedNumber || '')}</span>
      <span class="plabel">Reg. No.:</span>
      <span class="pvalue">${escapeHtml(receipt.regNumber || '')}</span>
    </div>`;
}

function itemRows(receipt, settings) {
  const minRows = Number(settings.print_table_rows) || 12;
  const rows = receipt.items
    .map(
      (item, index) => `
        <tr>
          <td class="col-no">${String(index + 1).padStart(2, '0')}</td>
          <td>${escapeHtml(item.testName)}</td>
          <td class="col-amt">${formatMoney(item.lineTotal)}</td>
        </tr>`
    )
    .join('');

  const fillerCount = Math.max(0, minRows - receipt.items.length);
  const fillers = Array.from({ length: fillerCount })
    .map(() => '<tr class="filler"><td class="col-no">&nbsp;</td><td>&nbsp;</td><td class="col-amt">&nbsp;</td></tr>')
    .join('');

  return rows + fillers;
}

/**
 * @param {object} receipt  mapped receipt (see receipt.service.mapReceipt)
 * @param {object} settings raw settings row
 * @param {{ logoSrc?: string }} [options]
 */
export function renderReceiptHtml(receipt, settings, options = {}) {
  const logoSrc = options.logoSrc || settings.logo_url || '';
  const currency = escapeHtml(settings.currency_symbol || 'Tk.');
  const ageText = receipt.age === null || receipt.age === undefined ? '' : `${receipt.age} ${receipt.ageUnit || 'Y'}`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Receipt ${escapeHtml(receipt.serialDisplay)}</title>
  <style>${buildCss(settings)}</style>
</head>
<body>
  <div class="sheet">
    ${receipt.status === 'VOID' ? '<div class="void">CANCELLED</div>' : ''}

    <div class="head">
      ${logoSrc ? `<div class="head__logo"><img src="${escapeHtml(logoSrc)}" alt="" /></div>` : ''}
      <div class="head__main">
        ${settings.hospital_name_bn ? `<div class="head__bn">${escapeHtml(settings.hospital_name_bn)}</div>` : ''}
        <div class="head__name">${escapeHtml(settings.hospital_name)}</div>
        <div class="head__address">${escapeHtml(settings.hospital_address)}</div>
        <div class="head__dept">${escapeHtml(settings.department_name)}</div>
      </div>
      ${bankBox(settings, receipt)}
    </div>

    <div class="titlebar">
      <div class="serial">SL. No <span>${escapeHtml(receipt.serialDisplay)}</span></div>
      <div class="title">${escapeHtml(settings.receipt_title)}</div>
      <div class="titlebar__spacer"></div>
    </div>

    <div class="patient">
      <div class="prow">
        <span class="plabel">Patient's Name:</span>
        <span class="pvalue pvalue--name">${escapeHtml(receipt.patientName)}</span>
        <span class="plabel">Age:</span>
        <span class="pvalue pvalue--fixed">${escapeHtml(ageText)}</span>
        <span class="plabel">Sex:</span>
        <span class="pvalue pvalue--fixed">${escapeHtml(SEX_LABEL[receipt.sex] || '')}</span>
      </div>
      <div class="prow">
        <span class="plabel">Ref. By:</span>
        <span class="pvalue">${escapeHtml(receipt.refBy || '')}</span>
      </div>
      ${wardRow(settings, receipt)}
    </div>

    <table class="items">
      <thead>
        <tr>
          <th class="col-no">No.</th>
          <th>Description</th>
          <th class="col-amt">${currency}</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows(receipt, settings)}
        <tr class="total">
          <td class="total__label" colspan="2">Total ${currency}:</td>
          <td class="col-amt">${formatMoney(receipt.totalAmount)}</td>
        </tr>
      </tbody>
    </table>

    <div class="words"><b>In Words:</b> ${escapeHtml(receipt.amountInWords)}</div>

    <div class="foot">
      <div class="foot__field">
        Report Delivery Date: <span class="line">${escapeHtml(
          formatDate(receipt.reportDeliveryDate, { fallback: '' })
        )}</span>
      </div>
      <div class="foot__field">
        Time: <span class="line">${escapeHtml(receipt.reportDeliveryTime || '')}</span>
      </div>
    </div>

    <div class="signs">
      <div class="sign">
        <div class="sign__value">${escapeHtml(receipt.bankOfficer || '')}</div>
        <div class="sign__line">Bank Officer</div>
      </div>
      <div class="sign">
        <div class="sign__value">${escapeHtml(receipt.preparedBy || receipt.createdByName || '')}</div>
        <div class="sign__line">Prepared By</div>
      </div>
    </div>

    ${settings.footer_note ? `<div class="note">${escapeHtml(settings.footer_note)}</div>` : ''}

    <div class="meta">
      <span>Issued: ${escapeHtml(formatDate(receipt.createdAt))}</span>
      <span>Ref: ${escapeHtml(receipt.serialDisplay)}</span>
    </div>
  </div>
</body>
</html>`;
}

export default renderReceiptHtml;
