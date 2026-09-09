import { supabaseAdmin } from '../config/supabase.js';
import asyncHandler from '../utils/asyncHandler.js';
import { throwIf } from '../middleware/errorHandler.js';
import { AUDIT } from '../services/audit.service.js';

/** GET /api/admin/audit-logs */
export const listAuditLogs = asyncHandler(async (req, res) => {
  const { page, pageSize, action, userId, from, to } = req.validatedQuery;

  let builder = supabaseAdmin
    .from('audit_logs')
    .select('*, actor:profiles!audit_logs_user_id_fkey(full_name, email, role)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (action) builder = builder.eq('action', action);
  if (userId) builder = builder.eq('user_id', userId);
  if (from) builder = builder.gte('created_at', `${from}T00:00:00Z`);
  if (to) builder = builder.lte('created_at', `${to}T23:59:59Z`);

  const offset = (page - 1) * pageSize;
  const { data, error, count } = await builder.range(offset, offset + pageSize - 1);
  throwIf(error, 'Could not load the audit log.');

  res.json({
    success: true,
    data: {
      items: (data || []).map((row) => ({
        id: row.id,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        metadata: row.metadata,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        createdAt: row.created_at,
        userId: row.user_id,
        userEmail: row.user_email ?? row.actor?.email ?? null,
        userName: row.actor?.full_name ?? null,
        userRole: row.actor?.role ?? null,
      })),
      page,
      pageSize,
      total: count ?? 0,
      totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
      actions: Object.values(AUDIT),
    },
  });
});
