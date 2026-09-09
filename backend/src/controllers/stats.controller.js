import { supabaseAdmin } from '../config/supabase.js';
import asyncHandler from '../utils/asyncHandler.js';
import { throwIf } from '../middleware/errorHandler.js';
import { getSettingsRow } from '../services/settings.service.js';
import { mapReceipt } from '../services/receipt.service.js';

/** GET /api/stats/dashboard */
export const dashboard = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'ADMIN';
  const settings = await getSettingsRow();

  const [statsResult, seriesResult, recentResult, pendingResult] = await Promise.all([
    supabaseAdmin.rpc('dashboard_stats', { p_user_id: req.user.id, p_is_admin: isAdmin }),
    supabaseAdmin.rpc('collection_series', { p_user_id: req.user.id, p_is_admin: isAdmin, p_days: 14 }),
    (() => {
      let builder = supabaseAdmin
        .from('receipts')
        .select('*, creator:profiles!receipts_created_by_fkey(full_name, email)')
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .limit(8);
      if (!isAdmin) builder = builder.eq('created_by', req.user.id);
      return builder;
    })(),
    isAdmin
      ? supabaseAdmin
          .from('profiles')
          .select('id, full_name, email, created_at')
          .eq('status', 'PENDING')
          .order('created_at', { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [], error: null }),
  ]);

  throwIf(statsResult.error, 'Could not load dashboard statistics.');
  throwIf(seriesResult.error, 'Could not load the collection chart.');
  throwIf(recentResult.error, 'Could not load recent receipts.');
  throwIf(pendingResult.error, 'Could not load pending users.');

  res.json({
    success: true,
    data: {
      stats: statsResult.data,
      series: (seriesResult.data || []).map((row) => ({
        day: row.day,
        receipts: Number(row.receipts),
        amount: Number(row.amount),
      })),
      recentReceipts: (recentResult.data || []).map((row) =>
        mapReceipt(row, { settings, creator: row.creator })
      ),
      pendingUsers: (pendingResult.data || []).map((u) => ({
        id: u.id,
        fullName: u.full_name,
        email: u.email,
        createdAt: u.created_at,
      })),
    },
  });
});
