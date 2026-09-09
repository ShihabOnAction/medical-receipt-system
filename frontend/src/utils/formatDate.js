const TZ = 'Asia/Dhaka';

const pad = (n) => String(n).padStart(2, '0');

/** "2026-09-09" -> "09-09-2026" */
export function formatDate(value, { fallback = '-' } = {}) {
  if (!value) return fallback;
  const date = toDate(value);
  if (!date) return fallback;
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(date)
    .replace(/\//g, '-');
}

export function formatDateLong(value, { fallback = '-' } = {}) {
  const date = toDate(value);
  if (!date) return fallback;
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export function formatDateTime(value, { fallback = '-' } = {}) {
  const date = toDate(value);
  if (!date) return fallback;
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/** "3 minutes ago" for audit rows. */
export function timeAgo(value) {
  const date = toDate(value);
  if (!date) return '';
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  const steps = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [7, 'day'],
    [4.35, 'week'],
    [12, 'month'],
  ];
  let amount = seconds;
  let unit = 'second';
  for (const [size, name] of steps) {
    if (Math.abs(amount) < size) {
      unit = name;
      break;
    }
    amount = Math.round(amount / size);
    unit = name;
  }
  if (unit === 'second' && Math.abs(amount) < 30) return 'just now';
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  return rtf.format(-amount, unit);
}

/** Today in the hospital's timezone, as YYYY-MM-DD for <input type="date">. */
export function todayISO() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date())
    .reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function daysAgoISO(days) {
  const date = new Date(Date.now() - days * 86400000);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const str = String(value);
  const date = new Date(str.length === 10 ? `${str}T00:00:00Z` : str);
  return Number.isNaN(date.getTime()) ? null : date;
}
