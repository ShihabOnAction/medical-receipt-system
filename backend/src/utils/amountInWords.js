/**
 * Amount -> English words using the South-Asian numbering system
 * (thousand / lakh / crore), which is what Bangladeshi money receipts use.
 *
 *   5000    -> "Five Thousand Only"
 *   3700    -> "Three Thousand Seven Hundred Only"
 *   125000  -> "One Lakh Twenty Five Thousand Only"
 *   1200.50 -> "One Thousand Two Hundred Taka and Fifty Poisha Only"
 */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n) {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return TENS[t] + (o ? ` ${ONES[o]}` : '');
}

function threeDigits(n) {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts = [];
  if (h) parts.push(`${ONES[h]} Hundred`);
  if (rest) parts.push(twoDigits(rest));
  return parts.join(' ');
}

/** Integer -> words, no trailing "Only". */
export function integerToWords(value) {
  let n = Math.floor(Math.abs(Number(value) || 0));
  if (n === 0) return 'Zero';

  const units = [
    { size: 10000000, label: 'Crore' },
    { size: 100000, label: 'Lakh' },
    { size: 1000, label: 'Thousand' },
  ];

  const parts = [];
  for (const { size, label } of units) {
    if (n >= size) {
      const chunk = Math.floor(n / size);
      n %= size;
      // crore itself can exceed 999 (e.g. 1500 crore)
      parts.push(`${label === 'Crore' ? integerToWords(chunk) : threeDigits(chunk)} ${label}`);
    }
  }
  if (n > 0) parts.push(threeDigits(n));

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Full receipt wording.
 * @param {number} amount
 * @param {{ currencyWord?: string, subUnitWord?: string }} [options]
 */
export function amountInWords(amount, options = {}) {
  const currencyWord = options.currencyWord || 'Taka';
  const subUnitWord = options.subUnitWord || 'Poisha';

  const value = Number(amount) || 0;
  const negative = value < 0;
  const abs = Math.abs(value);

  const whole = Math.floor(abs);
  const fraction = Math.round((abs - whole) * 100);

  let words;
  if (fraction > 0) {
    words = `${integerToWords(whole)} ${currencyWord} and ${integerToWords(fraction)} ${subUnitWord} Only`;
  } else {
    words = `${integerToWords(whole)} Only`;
  }

  return `${negative ? 'Minus ' : ''}${words}`;
}

export default amountInWords;
