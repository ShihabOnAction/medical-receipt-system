import { supabase } from '../lib/supabase.js';
import api, { unwrap, normalizeError } from './api.js';

/** Registration goes through the API so the domain rule cannot be bypassed. */
export async function register(payload) {
  const { data } = await api.post('/auth/register', payload);
  return data;
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) {
    const wrapped = new Error(
      /invalid login/i.test(error.message)
        ? 'Incorrect e-mail or password.'
        : /email not confirmed/i.test(error.message)
          ? 'This account is not confirmed yet. Contact the administrator.'
          : error.message
    );
    wrapped.isApiError = true;
    wrapped.code = 'AUTH_FAILED';
    throw wrapped;
  }
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw normalizeError(error);
}

export async function updatePassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw normalizeError(error);
}

export async function fetchProfile() {
  const { data } = await api.get('/auth/me');
  return data.data;
}

/** Stamps last_login_at and writes the USER_LOGGED_IN audit row. */
export async function touchSession() {
  const { data } = await api.post('/auth/session');
  return data.data;
}

export async function updateProfile(payload) {
  const { data } = await api.patch('/auth/me', payload);
  return data;
}

export { unwrap };
