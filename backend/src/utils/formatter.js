/** Kept free of the config module so these helpers stay pure and importable anywhere. */
const TIMEZONE = process.env.TZ_NAME || 'Asia/Dhaka';

/** 18 -> "000018" (padding comes from settings, so the hospital can match its old pad). */
export function formatSerial(serial, padding = 6, prefix = '') {
  const digits = String(serial ?? '').replace(/\D/g, '');
  return `${prefix || ''}${digits.padStart(Number(padding) || 6, '0')}`;
}

/** 3700 -> "3,700.00" */
export function formatMoney(amount, { decimals = 2, grouping = true } = {}) {
  const value = Number(amount) || 0;
  const fixed = value.toFixed(decimals);
  if (!grouping) return fixed;
  const [int, dec] = fixed.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return dec ? `${grouped}.${dec}` : grouped;
}

/** ISO date -> "09-09-2026" in the hospital's timezone. */
export function formatDate(value, { fallback = '' } = {}) {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(`${value}`.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return fallback;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('day')}-${get('month')}-${get('year')}`;
}

/** Escapes user data before it lands in the PDF template. */
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Safe filename fragment for the downloaded PDF. */
export function slugify(value, fallback = 'receipt') {
  const slug = String(value || '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .toLowerCase();
  return slug || fallback;
}

export const SEX_LABEL = { MALE: 'M', FEMALE: 'F', OTHER: 'O' };
export const SEX_FULL = { MALE: 'Male', FEMALE: 'Female', OTHER: 'Other' };
