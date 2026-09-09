import { createClient } from '@supabase/supabase-js';
import env from './env.js';

/**
 * Privileged client. Bypasses RLS, so it must never leave the server.
 * Every route that uses it goes through the auth + role middleware first.
 */
export const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: { 'x-application-name': 'medical-receipt-api' },
  },
});

/**
 * Verifies a browser access token and returns the auth user.
 * Returns null for any invalid / expired token.
 */
export async function getUserFromToken(accessToken) {
  if (!accessToken) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error || !data?.user) return null;
  return data.user;
}

export default supabaseAdmin;
