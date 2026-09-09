import { supabaseAdmin } from '../config/supabase.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { throwIf } from '../middleware/errorHandler.js';
import { logAudit, AUDIT } from '../services/audit.service.js';

const mapUser = (row) => ({
  id: row.id,
  fullName: row.full_name,
  email: row.email,
  role: row.role,
  status: row.status,
  phone: row.phone,
  designation: row.designation,
  approvedAt: row.approved_at,
  approvedBy: row.approved_by,
  approverName: row.approver?.full_name ?? null,
  lastLoginAt: row.last_login_at,
  createdAt: row.created_at,
});

const STATUS_ACTION = {
  APPROVED: AUDIT.USER_APPROVED,
  REJECTED: AUDIT.USER_REJECTED,
  SUSPENDED: AUDIT.USER_SUSPENDED,
  PENDING: AUDIT.USER_REACTIVATED,
};

/** GET /api/admin/users */
export const listUsers = asyncHandler(async (req, res) => {
  const { page, pageSize, search, status, role } = req.validatedQuery;

  // profiles.approved_by points back at profiles, and PostgREST resolves a
  // self-referencing embed by COLUMN name - the constraint name it accepts
  // everywhere else fails here with "no relationship in the schema cache".
  let builder = supabaseAdmin
    .from('profiles')
    .select('*, approver:profiles!approved_by(full_name)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (status !== 'ALL') builder = builder.eq('status', status);
  if (role !== 'ALL') builder = builder.eq('role', role);
  if (search) {
    const escaped = search.replace(/[%,()]/g, ' ').trim();
    builder = builder.or(`full_name.ilike.%${escaped}%,email.ilike.%${escaped}%`);
  }

  const from = (page - 1) * pageSize;
  const { data, error, count } = await builder.range(from, from + pageSize - 1);
  throwIf(error, 'Could not load users.');

  res.json({
    success: true,
    data: {
      items: (data || []).map(mapUser),
      page,
      pageSize,
      total: count ?? 0,
      totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
    },
  });
});

/** PATCH /api/admin/users/:id/status */
export const updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  if (id === req.user.id) throw ApiError.badRequest('You cannot change your own status.');

  const { data: target, error: findError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name, role, status')
    .eq('id', id)
    .maybeSingle();
  throwIf(findError, 'Could not load that user.');
  if (!target) throw ApiError.notFound('User not found.');

  if (target.role === 'ADMIN' && status !== 'APPROVED') {
    const { count } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'ADMIN')
      .eq('status', 'APPROVED');
    if ((count ?? 0) <= 1) throw ApiError.badRequest('This is the last active administrator.');
  }

  const patch = { status };
  if (status === 'APPROVED') {
    patch.approved_by = req.user.id;
    patch.approved_at = new Date().toISOString();
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  throwIf(error, 'Could not update that user.');

  await logAudit({
    req,
    action: STATUS_ACTION[status] || 'USER_STATUS_CHANGED',
    entityType: 'profile',
    entityId: id,
    metadata: { from: target.status, to: status, reason: reason ?? null, email: target.email },
  });

  res.json({ success: true, data: mapUser(data), message: `${target.full_name} is now ${status.toLowerCase()}.` });
});

/** PATCH /api/admin/users/:id/role */
export const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (id === req.user.id) throw ApiError.badRequest('You cannot change your own role.');

  const { data: target } = await supabaseAdmin.from('profiles').select('id, role, full_name').eq('id', id).maybeSingle();
  if (!target) throw ApiError.notFound('User not found.');

  if (target.role === 'ADMIN' && role === 'STAFF') {
    const { count } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'ADMIN')
      .eq('status', 'APPROVED');
    if ((count ?? 0) <= 1) throw ApiError.badRequest('This is the last active administrator.');
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ role })
    .eq('id', id)
    .select('*')
    .single();
  throwIf(error, 'Could not change that role.');

  await logAudit({
    req,
    action: AUDIT.USER_ROLE_CHANGED,
    entityType: 'profile',
    entityId: id,
    metadata: { from: target.role, to: role },
  });

  res.json({ success: true, data: mapUser(data), message: `${target.full_name} is now ${role.toLowerCase()}.` });
});

/** GET /api/admin/users/options - lightweight list for filter dropdowns */
export const userOptions = asyncHandler(async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email')
    .eq('status', 'APPROVED')
    .order('full_name');
  throwIf(error, 'Could not load users.');

  res.json({
    success: true,
    data: (data || []).map((u) => ({ id: u.id, fullName: u.full_name, email: u.email })),
  });
});
