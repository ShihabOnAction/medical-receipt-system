import axios from 'axios';
import { supabase, getAccessToken } from '../lib/supabase.js';
const rawBaseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const baseURL = rawBaseURL.replace(/\/+$/, '').endsWith('/api')
  ? rawBaseURL.replace(/\/+$/, '')
  : `${rawBaseURL.replace(/\/+$/, '')}/api`;

export const api = axios.create({
  baseURL,
  timeout: 60_000,
  headers: { 'Content-Type': 'application/json' },
});

/** Every request carries the current Supabase access token. */
api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let onUnauthorized = null;
/** The AuthProvider registers a callback so an expired session logs out cleanly. */
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // one retry after a token refresh, then give up
      const original = error.config;
      if (!original.__retried) {
        original.__retried = true;
        const { data } = await supabase.auth.refreshSession();
        if (data?.session?.access_token) {
          original.headers.Authorization = `Bearer ${data.session.access_token}`;
          return api(original);
        }
      }
      if (onUnauthorized) onUnauthorized();
    }
    return Promise.reject(normalizeError(error));
  }
);

/** Turns any axios/network failure into a predictable shape for the UI. */
export function normalizeError(error) {
  if (error?.isApiError) return error;

  const payload = error?.response?.data?.error;
  const normalized = new Error(
    payload?.message ||
      (error?.code === 'ECONNABORTED'
        ? 'The server is waking up from standby (free tier). Please wait a moment and try again.'
        : error?.message === 'Network Error'
          ? 'Cannot reach the server. Check your internet connection.'
          : 'Something went wrong. Please try again.')
  );
  normalized.isApiError = true;
  normalized.status = error?.response?.status ?? 0;
  normalized.code = payload?.code ?? 'NETWORK_ERROR';
  normalized.details = payload?.details ?? null;
  return normalized;
}

/** Unwraps the { success, data } envelope the API always returns. */
export const unwrap = (response) => response.data?.data;

export default api;
