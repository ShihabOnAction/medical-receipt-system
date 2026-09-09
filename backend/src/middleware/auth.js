import { supabaseAdmin, getUserFromToken } from '../config/supabase.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

const STATUS_MESSAGES = {
  PENDING: 'Your account is waiting for administrator approval.',
  REJECTED: 'Your registration was rejected. Contact the administrator.',
  SUSPENDED: 'Your account has been suspended. Contact the administrator.',
};

function bearerToken(req) {
  const header = req.headers.authorization || '';
  if (header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
  return null;
}

/**
 * Verifies the Supabase access token and loads the profile.
 * Attaches req.user = { id, email, role, status, fullName }.
 */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const token = bearerToken(req);
  if (!token) throw ApiError.unauthorized('Sign in to continue.');

  const authUser = await getUserFromToken(token);
  if (!authUser) throw ApiError.unauthorized('Your session has expired. Please sign in again.');

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, role, status, phone, designation, created_at')
    .eq('id', authUser.id)
    .maybeSingle();

  if (error) throw ApiError.internal('Could not load your profile.');
  if (!profile) throw ApiError.forbidden('No profile is linked to this account.');

  req.accessToken = token;
  req.user = {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role,
    status: profile.status,
    phone: profile.phone,
    designation: profile.designation,
    createdAt: profile.created_at,
  };
  next();
});

/**
 * Attaches req.user when a valid token is present, and simply carries on when
 * it is not. Used by endpoints that serve public branding to the sign-in page
 * but richer data to a signed-in user.
 */
export const optionalAuthenticate = asyncHandler(async (req, _res, next) => {
  const token = bearerToken(req);
  if (!token) return next();

  const authUser = await getUserFromToken(token);
  if (!authUser) return next();

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, role, status')
    .eq('id', authUser.id)
    .maybeSingle();

  if (profile) {
    req.accessToken = token;
    req.user = {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      role: profile.role,
      status: profile.status,
    };
  }
  return next();
});

/** Requires an APPROVED account (blocks PENDING / REJECTED / SUSPENDED). */
export const requireApproved = (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (req.user.status !== 'APPROVED') {
    return next(
      new ApiError(403, STATUS_MESSAGES[req.user.status] || 'Your account is not active.', `ACCOUNT_${req.user.status}`)
    );
  }
  return next();
};

export default authenticate;
