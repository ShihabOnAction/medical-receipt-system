import { supabaseAdmin } from '../config/supabase.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { throwIf } from '../middleware/errorHandler.js';
import { logAudit, AUDIT } from '../services/audit.service.js';

const mapTest = (row) => ({
  id: row.id,
  name: row.name,
  shortCode: row.short_code,
  category: row.category,
  price: Number(row.price),
  isActive: row.is_active,
  displayOrder: row.display_order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/**
 * GET /api/tests
 * Staff get the active catalogue; admins can ask for everything with
 * ?includeInactive=true.
 */
export const listTests = asyncHandler(async (req, res) => {
  const includeInactive = req.query.includeInactive === 'true' && req.user.role === 'ADMIN';
  const search = (req.query.search || '').toString().trim();

  let builder = supabaseAdmin
    .from('tests')
    .select('*')
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  if (!includeInactive) builder = builder.eq('is_active', true);
  if (search) builder = builder.ilike('name', `%${search.replace(/[%,]/g, ' ')}%`);

  const { data, error } = await builder;
  throwIf(error, 'Could not load the test list.');

  res.json({ success: true, data: (data || []).map(mapTest) });
});

/** POST /api/admin/tests */
export const createTest = asyncHandler(async (req, res) => {
  const payload = req.body;

  const { data, error } = await supabaseAdmin
    .from('tests')
    .insert({
      name: payload.name,
      short_code: payload.shortCode ?? null,
      category: payload.category || 'GENERAL',
      price: payload.price,
      is_active: payload.isActive,
      display_order: payload.displayOrder,
    })
    .select('*')
    .single();

  if (error?.code === '23505') throw ApiError.conflict('A test with this name already exists.');
  throwIf(error, 'Could not create the test.');

  await logAudit({
    req,
    action: AUDIT.TEST_CREATED,
    entityType: 'test',
    entityId: data.id,
    metadata: { name: data.name, price: Number(data.price) },
  });

  res.status(201).json({ success: true, data: mapTest(data), message: `"${data.name}" added.` });
});

/** PATCH /api/admin/tests/:id */
export const updateTest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const payload = req.body;

  const { data: existing } = await supabaseAdmin.from('tests').select('*').eq('id', id).maybeSingle();
  if (!existing) throw ApiError.notFound('Test not found.');

  const patch = {};
  if (payload.name !== undefined) patch.name = payload.name;
  if (payload.shortCode !== undefined) patch.short_code = payload.shortCode;
  if (payload.category !== undefined) patch.category = payload.category;
  if (payload.price !== undefined) patch.price = payload.price;
  if (payload.isActive !== undefined) patch.is_active = payload.isActive;
  if (payload.displayOrder !== undefined) patch.display_order = payload.displayOrder;

  if (!Object.keys(patch).length) throw ApiError.badRequest('Nothing to update.');

  const { data, error } = await supabaseAdmin.from('tests').update(patch).eq('id', id).select('*').single();
  if (error?.code === '23505') throw ApiError.conflict('A test with this name already exists.');
  throwIf(error, 'Could not update the test.');

  // Price changes and enable/disable get their own audit entries - these are
  // the events an auditor actually looks for.
  if (patch.price !== undefined && Number(patch.price) !== Number(existing.price)) {
    await logAudit({
      req,
      action: AUDIT.TEST_PRICE_CHANGED,
      entityType: 'test',
      entityId: id,
      metadata: { name: data.name, from: Number(existing.price), to: Number(data.price) },
    });
  }
  if (patch.is_active !== undefined && patch.is_active !== existing.is_active) {
    await logAudit({
      req,
      action: patch.is_active ? AUDIT.TEST_ENABLED : AUDIT.TEST_DISABLED,
      entityType: 'test',
      entityId: id,
      metadata: { name: data.name },
    });
  }
  await logAudit({
    req,
    action: AUDIT.TEST_UPDATED,
    entityType: 'test',
    entityId: id,
    metadata: { name: data.name, changed: Object.keys(patch) },
  });

  res.json({ success: true, data: mapTest(data), message: `"${data.name}" updated.` });
});

/**
 * DELETE /api/admin/tests/:id
 * A test referenced by a historical receipt is never removed - it is
 * retired instead, so old receipts keep their meaning.
 */
export const retireTest = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: existing } = await supabaseAdmin.from('tests').select('*').eq('id', id).maybeSingle();
  if (!existing) throw ApiError.notFound('Test not found.');

  const { count } = await supabaseAdmin
    .from('receipt_items')
    .select('id', { count: 'exact', head: true })
    .eq('test_id', id);

  if ((count ?? 0) > 0) {
    const { data, error } = await supabaseAdmin
      .from('tests')
      .update({ is_active: false })
      .eq('id', id)
      .select('*')
      .single();
    throwIf(error, 'Could not disable the test.');

    await logAudit({
      req,
      action: AUDIT.TEST_DISABLED,
      entityType: 'test',
      entityId: id,
      metadata: { name: existing.name, reason: 'used_by_receipts', receiptItems: count },
    });

    return res.json({
      success: true,
      data: mapTest(data),
      message: `"${existing.name}" is used by ${count} receipt(s), so it was disabled instead of deleted.`,
    });
  }

  const { error } = await supabaseAdmin.from('tests').delete().eq('id', id);
  throwIf(error, 'Could not delete the test.');

  await logAudit({
    req,
    action: AUDIT.TEST_DISABLED,
    entityType: 'test',
    entityId: id,
    metadata: { name: existing.name, deleted: true },
  });

  return res.json({ success: true, data: null, message: `"${existing.name}" deleted.` });
});

/** PATCH /api/admin/tests/reorder */
export const reorderTests = asyncHandler(async (req, res) => {
  const { order } = req.body;

  const updates = order.map(({ id, displayOrder }) =>
    supabaseAdmin.from('tests').update({ display_order: displayOrder }).eq('id', id)
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  throwIf(failed?.error, 'Could not reorder the tests.');

  await logAudit({ req, action: AUDIT.TEST_REORDERED, entityType: 'test', metadata: { count: order.length } });

  res.json({ success: true, message: 'Order saved.' });
});
