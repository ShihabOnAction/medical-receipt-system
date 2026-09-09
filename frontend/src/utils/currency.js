/** Display helpers for money. Amounts themselves always come from the API. */

export function formatMoney(amount, { decimals = 2, symbol = '' } = {}) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return symbol ? `${symbol} 0.00` : '0.00';
  const fixed = value.toFixed(decimals);
  const [int, dec] = fixed.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const text = dec ? `${grouped}.${dec}` : grouped;
  return symbol ? `${symbol} ${text}` : text;
}

/** Compact form for dashboard tiles: 125000 -> "1.25 L" */
export function formatCompact(amount) {
  const value = Number(amount) || 0;
  if (Math.abs(value) >= 10000000) return `${(value / 10000000).toFixed(2)} Cr`;
  if (Math.abs(value) >= 100000) return `${(value / 100000).toFixed(2)} L`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return formatMoney(value, { decimals: 0 });
}

export const SEX_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

export const AGE_UNITS = [
  { value: 'Y', label: 'Years' },
  { value: 'M', label: 'Months' },
  { value: 'D', label: 'Days' },
];
