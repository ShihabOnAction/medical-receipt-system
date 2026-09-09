import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { setUnauthorizedHandler } from '../services/api.js';
import * as authService from '../services/auth.js';

const AuthContext = createContext(null);

/**
 * Holds the Supabase session plus the hospital profile (role + status).
 * Authorisation decisions in the UI are convenience only - the API checks
 * the same rules on every request.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const touched = useRef(false);

  const loadProfile = useCallback(async ({ touch = false } = {}) => {
    try {
      const data = touch ? await authService.touchSession() : await authService.fetchProfile();
      setProfile(data);
      setError(null);
      return data;
    } catch (err) {
      // A 403 here means the account exists but is not approved yet - that is
      // a state the UI has to show, not an error to swallow.
      if (err.status === 403) {
        setProfile(null);
        setError(err);
        return null;
      }
      setProfile(null);
      setError(err);
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session ?? null);
      if (data.session) await loadProfile();
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!active) return;
      setSession(nextSession ?? null);

      if (event === 'SIGNED_OUT' || !nextSession) {
        setProfile(null);
        touched.current = false;
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        const shouldTouch = !touched.current;
        touched.current = true;
        await loadProfile({ touch: shouldTouch });
        setLoading(false);
      }
    });

    return () => {
      active = false;
      listener?.subscription?.unsubscribe();
    };
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setProfile(null);
    setSession(null);
    touched.current = false;
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      signOut().catch(() => {});
    });
  }, [signOut]);

  const signIn = useCallback(
    async (credentials) => {
      const data = await authService.signIn(credentials);
      setSession(data.session);
      touched.current = true;
      const nextProfile = await loadProfile({ touch: true });
      return nextProfile;
    },
    [loadProfile]
  );

  const value = useMemo(() => {
    const status = profile?.status ?? (session ? 'PENDING' : null);
    return {
      session,
      user: profile,
      profile,
      loading,
      error,
      isAuthenticated: Boolean(session),
      isApproved: profile?.status === 'APPROVED',
      isAdmin: profile?.role === 'ADMIN' && profile?.status === 'APPROVED',
      isStaff: profile?.role === 'STAFF',
      status,
      signIn,
      signOut,
      register: authService.register,
      refreshProfile: loadProfile,
      updateProfile: async (payload) => {
        const result = await authService.updateProfile(payload);
        setProfile((current) => ({ ...current, ...result.data }));
        return result;
      },
    };
  }, [session, profile, loading, error, signIn, signOut, loadProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
}

export default AuthContext;
