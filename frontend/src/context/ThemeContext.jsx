import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { applyPreferences, loadPreferences, savePreferences, applyBrandColors } from '../utils/theme.js';

const ThemeContext = createContext(null);

const DEFAULTS = {
  mode: 'system',
  density: 'comfortable',
  radius: 1,
  fontScale: 1,
};

/**
 * Per-user interface preferences. These are written straight onto the
 * document root as CSS custom properties, so a change repaints the whole
 * app immediately.
 */
export function ThemeProvider({ children }) {
  const [prefs, setPrefs] = useState(() => ({ ...DEFAULTS, ...loadPreferences() }));
  const [resolvedMode, setResolvedMode] = useState('light');

  useEffect(() => {
    setResolvedMode(applyPreferences(prefs));
    savePreferences(prefs);
  }, [prefs]);

  // Follow the OS when the user chose "system".
  useEffect(() => {
    if (prefs.mode !== 'system') return undefined;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setResolvedMode(applyPreferences(prefs));
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [prefs]);

  const update = useCallback((patch) => {
    setPrefs((current) => ({ ...current, ...patch }));
  }, []);

  const value = useMemo(
    () => ({
      ...prefs,
      resolvedMode,
      isDark: resolvedMode === 'dark',
      setMode: (mode) => update({ mode }),
      toggleMode: () => update({ mode: resolvedMode === 'dark' ? 'light' : 'dark' }),
      setDensity: (density) => update({ density }),
      setRadius: (radius) => update({ radius: Number(radius) }),
      setFontScale: (fontScale) => update({ fontScale: Number(fontScale) }),
      reset: () => setPrefs(DEFAULTS),
      /** Live preview of a brand colour without saving it. */
      previewBrand: applyBrandColors,
    }),
    [prefs, resolvedMode, update]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>.');
  return context;
}

export default ThemeContext;
