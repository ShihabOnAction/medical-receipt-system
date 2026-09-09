import { supabaseAdmin } from '../config/supabase.js';
import { throwIf } from '../middleware/errorHandler.js';
import ApiError from '../utils/ApiError.js';
import amountInWords from '../utils/amountInWords.js';
import { formatSerial } from '../utils/formatter.js';
import { getSettingsRow } from './settings.service.js';

const RECEIPT_COLUMNS = [
  'id',
  'serial_number',
  'receipt_date',
  'patient_name',
  'age',
  'age_unit',
  'sex',
  'ref_by',
  'opd_ward',
  'bed_number',
  'reg_number',
  'total_amount',
  'amount_in_words',
  'report_delivery_date',
  'report_delivery_time',
  'bank_officer',
  'prepared_by',
  'remarks',
  'status',
  'void_reason',
  'voided_at',
  'created_by',
  'created_at',
  'updated_at',
].join(',');

export function mapReceipt(row, { items = [], creator = null, settings = null } = {}) {
  if (!row) return null;
  const padding = settings?.serial_padding ?? 6;
  const prefix = settings?.serial_prefix ?? '';
  return {
    id: row.id,
    serialNumber: Number(row.serial_number),
    serialDisplay: formatSerial(row.serial_number, padding, prefix),
    receiptDate: row.receipt_date,
    patientName: row.patient_name,
    age: row.age,
    ageUnit: row.age_unit,
    sex: row.sex,
    refBy: row.ref_by,
    opdWard: row.opd_ward,
    bedNumber: row.bed_number,
    regNumber: row.reg_number,
    totalAmount: Number(row.total_amount),
    amountInWords: row.amount_in_words,
    reportDeliveryDate: row.report_delivery_date,
    reportDeliveryTime: row.report_delivery_time,
    bankOfficer: row.bank_officer,
    preparedBy: row.prepared_by,
    remarks: row.remarks,
    status: row.status,
    voidReason: row.void_reason,
    voidedAt: row.voided_at,
    createdBy: row.created_by,
    createdByName: creator?.full_name ?? row.creator?.full_name ?? null,
    createdByEmail: creator?.email ?? row.creator?.email ?? null,
    createdAt: row.created_at,
    items: items.map((item) => ({
      id: item.id,
      testId: item.test_id,
      testName: item.test_name,
      unitPrice: Number(item.unit_price),
      quantity: item.quantity,
      lineTotal: Number(item.line_total),
      lineNo: item.line_no,
    })),
  };
}

/**
 * Creates a receipt.
 * Prices and the serial number come from Postgres inside a single
 * transaction (public.create_receipt); nothing financial is trusted
 * from the browser.
 */
export async function createReceipt({ payload, userId }) {
  const settings = await getSettingsRow();

  // Authoritative price read (the RPC re-checks this inside its transaction).
  const { data: tests, error: testError } = await supabaseAdmin
    .from('tests')
    .select('id, name, price, is_active')
    .in('id', payload.testIds);
  throwIf(testError, 'Could not load the selected tests.');

  const byId = new Map((tests || []).map((t) => [t.id, t]));
  const uniqueIds = [...new Set(payload.testIds)];

  const missing = uniqueIds.filter((id) => !byId.has(id));
  if (missing.length) throw ApiError.badRequest('One of the selected tests no longer exists. Refresh the page.');

  const inactive = uniqueIds.filter((id) => !byId.get(id).is_active);
  if (inactive.length) {
    throw ApiError.badRequest(
      `This test is no longer available: ${inactive.map((id) => byId.get(id).name).join(', ')}`
    );
  }

  const serverTotal = uniqueIds.reduce((sum, id) => sum + Number(byId.get(id).price), 0);

  if (payload.expectedTotal !== null && Math.abs(payload.expectedTotal - serverTotal) > 0.009) {
    throw ApiError.conflict(
      'A test price changed while you were filling in the form. The amount has been refreshed - please confirm and submit again.',
      { serverTotal }
    );
  }

  const words = amountInWords(serverTotal, { currencyWord: settings.currency_word });

  const { data, error } = await supabaseAdmin.rpc('create_receipt', {
    p_created_by: userId,
    p_payload: {
      patientName: payload.patientName,
      age: payload.age,
      ageUnit: payload.ageUnit,
      sex: payload.sex,
      refBy: payload.refBy,
      opdWard: payload.opdWard,
      bedNumber: payload.bedNumber,
      regNumber: payload.regNumber,
      receiptDate: payload.receiptDate,
      reportDeliveryDate: payload.reportDeliveryDate,
      reportDeliveryTime: payload.reportDeliveryTime,
      bankOfficer: payload.bankOfficer,
      preparedBy: payload.preparedBy,
      remarks: payload.remarks,
    },
    p_test_ids: uniqueIds,
    p_expected_total: serverTotal,
    p_amount_in_words: words,
  });
  throwIf(error, 'Could not create the receipt.');

  return getReceiptById(data.id, { settings });
}

export async function getReceiptById(id, { settings = null } = {}) {
  const config = settings || (await getSettingsRow());

  const { data: receipt, error } = await supabaseAdmin
    .from('receipts')
    .select(RECEIPT_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  throwIf(error, 'Could not load the receipt.');
  if (!receipt) return null;

  const [{ data: items, error: itemError }, { data: creator }] = await Promise.all([
    supabaseAdmin.from('receipt_items').select('*').eq('receipt_id', id).order('line_no', { ascending: true }),
    supabaseAdmin.from('profiles').select('full_name, email').eq('id', receipt.created_by).maybeSingle(),
  ]);
  throwIf(itemError, 'Could not load the receipt items.');

  return mapReceipt(receipt, { items: items || [], creator, settings: config });
}

export async function listReceipts({ query, user }) {
  const settings = await getSettingsRow();
  const { page, pageSize, search, from, to, status, sort, createdBy } = query;

  let builder = supabaseAdmin
    .from('receipts')
    .select(`${RECEIPT_COLUMNS}, creator:profiles!receipts_created_by_fkey(full_name, email)`, { count: 'exact' });

  // Staff only ever see their own receipts; admins see everything.
  if (user.role !== 'ADMIN') builder = builder.eq('created_by', user.id);
  else if (createdBy) builder = builder.eq('created_by', createdBy);

  if (status !== 'ALL') builder = builder.eq('status', status);
  if (from) builder = builder.gte('receipt_date', from);
  if (to) builder = builder.lte('receipt_date', to);

  if (search) {
    const digits = search.replace(/\D/g, '');
    const escaped = search.replace(/[%,()]/g, ' ').trim();
    const filters = [`patient_name.ilike.%${escaped}%`, `ref_by.ilike.%${escaped}%`, `reg_number.ilike.%${escaped}%`];
    if (digits) filters.push(`serial_number.eq.${Number(digits)}`);
    builder = builder.or(filters.join(','));
  }

  const sorts = {
    newest: ['created_at', false],
    oldest: ['created_at', true],
    amount_desc: ['total_amount', false],
    amount_asc: ['total_amount', true],
  };
  const [column, ascending] = sorts[sort] || sorts.newest;
  builder = builder.order(column, { ascending });

  const fromRow = (page - 1) * pageSize;
  const { data, error, count } = await builder.range(fromRow, fromRow + pageSize - 1);
  throwIf(error, 'Could not load receipts.');

  return {
    items: (data || []).map((row) => mapReceipt(row, { settings, creator: row.creator })),
    page,
    pageSize,
    total: count ?? 0,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
  };
}

export async function voidReceipt({ id, adminId, reason }) {
  const { data, error } = await supabaseAdmin.rpc('void_receipt', {
    p_receipt_id: id,
    p_admin_id: adminId,
    p_reason: reason,
  });
  throwIf(error, 'Could not cancel the receipt.');
  return data;
}

export { RECEIPT_COLUMNS };
