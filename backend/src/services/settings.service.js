import { supabaseAdmin } from '../config/supabase.js';
import { throwIf } from '../middleware/errorHandler.js';

const CACHE_TTL_MS = 30_000;
let cache = { value: null, expiresAt: 0 };

const DEFAULTS = {
  id: 1,
  hospital_name: 'Bangladesh Medical University',
  hospital_name_bn: '',
  hospital_address: 'Shahbag, Dhaka-1000',
  department_name: 'DEPARTMENT OF NEUROLOGY',
  receipt_title: 'MONEY RECEIPT REQUIRED TEST LIST',
  logo_url: '/logo.png',
  bank_name: 'PUBALI BANK PLC',
  bank_account_label: 'Account Number',
  bank_account_number: '',
  currency_symbol: 'Tk.',
  currency_word: 'Taka',
  footer_note: '',
  serial_padding: 6,
  serial_prefix: '',
  print_table_rows: 12,
  theme_primary: '#0f766e',
  theme_accent: '#0284c7',
  pdf_font_family: 'Helvetica, Arial, sans-serif',
  pdf_base_font_size: 12,
  show_bank_box: true,
  show_ward_fields: true,
};

/** snake_case row -> camelCase payload for the API/frontend. */
export function toClientSettings(row) {
  const s = { ...DEFAULTS, ...(row || {}) };
  return {
    hospitalName: s.hospital_name,
    hospitalNameBn: s.hospital_name_bn,
    hospitalAddress: s.hospital_address,
    departmentName: s.department_name,
    receiptTitle: s.receipt_title,
    logoUrl: s.logo_url,
    bankName: s.bank_name,
    bankAccountLabel: s.bank_account_label,
    bankAccountNumber: s.bank_account_number,
    currencySymbol: s.currency_symbol,
    currencyWord: s.currency_word,
    footerNote: s.footer_note,
    serialPadding: s.serial_padding,
    serialPrefix: s.serial_prefix,
    printTableRows: s.print_table_rows,
    themePrimary: s.theme_primary,
    themeAccent: s.theme_accent,
    pdfFontFamily: s.pdf_font_family,
    pdfBaseFontSize: s.pdf_base_font_size,
    showBankBox: s.show_bank_box,
    showWardFields: s.show_ward_fields,
    updatedAt: s.updated_at ?? null,
  };
}

/**
 * The subset safe to hand an unauthenticated visitor: it is only what the
 * sign-in page needs to wear the hospital's identity and colours. No bank
 * details, no print-layout internals.
 */
export function toPublicSettings(row) {
  const full = toClientSettings(row);
  return {
    hospitalName: full.hospitalName,
    hospitalNameBn: full.hospitalNameBn,
    hospitalAddress: full.hospitalAddress,
    departmentName: full.departmentName,
    logoUrl: full.logoUrl,
    themePrimary: full.themePrimary,
    themeAccent: full.themeAccent,
    currencySymbol: full.currencySymbol,
    isPublic: true,
  };
}

/** camelCase payload -> snake_case row for the database. */
export function toDbSettings(payload) {
  const map = {
    hospitalName: 'hospital_name',
    hospitalNameBn: 'hospital_name_bn',
    hospitalAddress: 'hospital_address',
    departmentName: 'department_name',
    receiptTitle: 'receipt_title',
    logoUrl: 'logo_url',
    bankName: 'bank_name',
    bankAccountLabel: 'bank_account_label',
    bankAccountNumber: 'bank_account_number',
    currencySymbol: 'currency_symbol',
    currencyWord: 'currency_word',
    footerNote: 'footer_note',
    serialPadding: 'serial_padding',
    serialPrefix: 'serial_prefix',
    printTableRows: 'print_table_rows',
    themePrimary: 'theme_primary',
    themeAccent: 'theme_accent',
    pdfFontFamily: 'pdf_font_family',
    pdfBaseFontSize: 'pdf_base_font_size',
    showBankBox: 'show_bank_box',
    showWardFields: 'show_ward_fields',
  };
  const row = {};
  for (const [key, column] of Object.entries(map)) {
    if (payload[key] !== undefined) row[column] = payload[key] ?? '';
  }
  return row;
}

/** Raw settings row, cached briefly so PDF generation stays cheap. */
export async function getSettingsRow({ fresh = false } = {}) {
  if (!fresh && cache.value && cache.expiresAt > Date.now()) return cache.value;

  const { data, error } = await supabaseAdmin.from('settings').select('*').eq('id', 1).maybeSingle();
  throwIf(error, 'Could not load hospital settings.');

  const value = { ...DEFAULTS, ...(data || {}) };
  cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

export async function updateSettings(patch, userId) {
  const row = toDbSettings(patch);
  row.id = 1;
  row.updated_by = userId ?? null;

  const { data, error } = await supabaseAdmin
    .from('settings')
    .upsert(row, { onConflict: 'id' })
    .select('*')
    .single();
  throwIf(error, 'Could not save hospital settings.');

  cache = { value: data, expiresAt: Date.now() + CACHE_TTL_MS };
  return data;
}

export function invalidateSettingsCache() {
  cache = { value: null, expiresAt: 0 };
}

export default getSettingsRow;
