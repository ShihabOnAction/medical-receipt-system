import { supabaseAdmin } from '../config/supabase.js';

export const AUDIT = {
  USER_REGISTERED: 'USER_REGISTERED',
  USER_LOGGED_IN: 'USER_LOGGED_IN',
  USER_APPROVED: 'USER_APPROVED',
  USER_REJECTED: 'USER_REJECTED',
  USER_SUSPENDED: 'USER_SUSPENDED',
  USER_REACTIVATED: 'USER_REACTIVATED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  PROFILE_UPDATED: 'PROFILE_UPDATED',

  RECEIPT_CREATED: 'RECEIPT_CREATED',
  RECEIPT_VIEWED: 'RECEIPT_VIEWED',
  RECEIPT_PDF_GENERATED: 'RECEIPT_PDF_GENERATED',
  RECEIPT_VOIDED: 'RECEIPT_VOIDED',

  TEST_CREATED: 'TEST_CREATED',
  TEST_UPDATED: 'TEST_UPDATED',
  TEST_PRICE_CHANGED: 'TEST_PRICE_CHANGED',
  TEST_DISABLED: 'TEST_DISABLED',
  TEST_ENABLED: 'TEST_ENABLED',
  TEST_REORDERED: 'TEST_REORDERED',

  SETTINGS_UPDATED: 'SETTINGS_UPDATED',
};

function clientIp(req) {
  const forwarded = req?.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) return forwarded.split(',')[0].trim();
  return req?.ip || null;
}

/**
 * Fire-and-forget audit write. Never blocks or fails the caller's request -
 * a broken log line must not stop a receipt from being issued.
 */
export async function logAudit({ req, userId, userEmail, action, entityType, entityId, metadata }) {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      user_id: userId ?? req?.user?.id ?? null,
      user_email: userEmail ?? req?.user?.email ?? null,
      action,
      entity_type: entityType ?? null,
      entity_id: entityId ? String(entityId) : null,
      metadata: metadata ?? {},
      ip_address: clientIp(req),
      user_agent: req?.headers?.['user-agent']?.slice(0, 300) ?? null,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[audit] failed to write log:', action, error?.message);
  }
}

export default logAudit;
