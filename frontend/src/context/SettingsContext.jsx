import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getSettings } from '../services/settings.js';
import { applyBrandColors, loadCachedBrand } from '../utils/theme.js';
import { useAuthContext } from './AuthContext.jsx';

const SettingsContext = createContext(null);

/** Used until the API answers, so the first paint is never empty. */
const FALLBACK = {
  hospitalName: 'Bangladesh Medical University',
  hospitalNameBn: '',
  hospitalAddress: 'Shahbag, Dhaka-1000',
  departmentName: 'DEPARTMENT OF NEUROLOGY',
  receiptTitle: 'MONEY RECEIPT REQUIRED TEST LIST',
  logoUrl: '/logo.png',
  bankName: 'PUBALI BANK PLC',
  bankAccountLabel: 'Account Number',
  bankAccountNumber: '',
  currencySymbol: 'Tk.',
  currencyWord: 'Taka',
  footerNote: '',
  serialPadding: 6,
  serialPrefix: '',
  printTableRows: 12,
  themePrimary: '#0f766e',
  themeAccent: '#0284c7',
  pdfFontFamily: 'Helvetica, Arial, sans-serif',
  pdfBaseFontSize: 12,
  showBankBox: true,
  showWardFields: true,
};

/**
 * Hospital settings drive both the printed receipt and the app's own brand
 * colours - one row in the database, no hard-coded hospital details.
 *
 * The initial state is seeded from the last colours this browser saw, so a
 * refresh (or the sign-in page, which has no session yet) never flashes back
 * to the built-in default before the API answers.
 */
export function SettingsProvider({ children }) {
  const { isAuthenticated } = useAuthContext();
  const [settings, setSettings] = useState(() => {
    const cached = loadCachedBrand();
    return cached?.primary
      ? { ...FALLBACK, themePrimary: cached.primary, themeAccent: cached.accent || FALLBACK.themeAccent }
      : FALLBACK;
  });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSettings();
      // A public response carries only branding, so merge rather than replace.
      setSettings((current) => ({ ...FALLBACK, ...current, ...data }));
      return data;
    } catch {
      // Not fatal: the app keeps working with the fallback branding.
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on first paint for everyone - the endpoint serves branding to
  // anonymous callers - and again after signing in, which returns the full row.
  useEffect(() => {
    refresh();
  }, [isAuthenticated, refresh]);

  useEffect(() => {
    applyBrandColors({ primary: settings.themePrimary, accent: settings.themeAccent }, { persist: true });
  }, [settings.themePrimary, settings.themeAccent]);

  const value = useMemo(
    () => ({
      settings,
      loading,
      refresh,
      /** Called by the settings form after a successful save. */
      applyLocal: (patch) => setSettings((current) => ({ ...current, ...patch })),
      formatSerial: (serial) =>
        `${settings.serialPrefix || ''}${String(serial ?? '').padStart(settings.serialPadding || 6, '0')}`,
    }),
    [settings, loading, refresh]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used inside <SettingsProvider>.');
  return context;
}

export default SettingsContext;
