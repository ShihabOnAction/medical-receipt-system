import { supabaseAdmin } from '../config/supabase.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { throwIf } from '../middleware/errorHandler.js';
import { logAudit, AUDIT } from '../services/audit.service.js';

/**
 * POST /api/auth/register
 * The account is created server-side so the e-mail domain rule, the STAFF
 * role and the PENDING status can never be tampered with by the browser.
 */
export const register = asyncHandler(async (req, res) => {
  const { fullName, email, password, phone, designation } = req.body;

  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('id, status')
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    throw ApiError.conflict('An account with this e-mail already exists. Try signing in instead.');
  }

  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // hospital staff are vetted by an admin, not by e-mail
    user_metadata: { full_name: fullName, role: 'STAFF', status: 'PENDING' },
  });

  if (error) {
    if (/already/i.test(error.message)) {
      throw ApiError.conflict('An account with this e-mail already exists. Try signing in instead.');
    }
    throw ApiError.badRequest(error.message);
  }

  // The auth trigger inserts a base profile; make sure our extra fields land too.
  const { error: profileError } = await supabaseAdmin.from('profiles').upsert(
    {
      id: created.user.id,
      full_name: fullName,
      email,
      phone: phone ?? null,
      designation: designation ?? null,
      role: 'STAFF',
      status: 'PENDING',
    },
    { onConflict: 'id' }
  );

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(created.user.id).catch(() => {});
    throwIf(profileError, 'Could not complete registration.');
  }

  await logAudit({
    req,
    userId: created.user.id,
    userEmail: email,
    action: AUDIT.USER_REGISTERED,
    entityType: 'profile',
    entityId: created.user.id,
    metadata: { fullName },
  });

  res.status(201).json({
    success: true,
    data: {
      id: created.user.id,
      email,
      fullName,
      status: 'PENDING',
    },
    message: 'Registration received. An administrator will approve your account shortly.',
  });
});

/** GET /api/auth/me */
export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user });
});

/** POST /api/auth/session - records the login, returns the profile. */
export const touchSession = asyncHandler(async (req, res) => {
  await supabaseAdmin.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', req.user.id);

  await logAudit({
    req,
    action: AUDIT.USER_LOGGED_IN,
    entityType: 'profile',
    entityId: req.user.id,
  });

  res.json({ success: true, data: req.user });
});

/** PATCH /api/auth/me */
export const updateMyProfile = asyncHandler(async (req, res) => {
  const patch = {};
  if (req.body.fullName !== undefined) patch.full_name = req.body.fullName;
  if (req.body.phone !== undefined) patch.phone = req.body.phone;
  if (req.body.designation !== undefined) patch.designation = req.body.designation;

  if (!Object.keys(patch).length) throw ApiError.badRequest('Nothing to update.');

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(patch)
    .eq('id', req.user.id)
    .select('id, full_name, email, role, status, phone, designation')
    .single();
  throwIf(error, 'Could not update your profile.');

  await logAudit({ req, action: AUDIT.PROFILE_UPDATED, entityType: 'profile', entityId: req.user.id, metadata: patch });

  res.json({
    success: true,
    data: {
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      role: data.role,
      status: data.status,
      phone: data.phone,
      designation: data.designation,
    },
    message: 'Profile updated.',
  });
});
