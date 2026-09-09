/**
 * Runtime theming.
 *
 * The hospital picks one brand colour in Admin -> Settings; this file turns
 * that single hex value into a full 50..900 ramp and writes it onto
 * :root as `R G B` triplets, which every Tailwind class already reads.
 * Changing the colour therefore restyles the entire app instantly - no
 * rebuild, no hard-coded palette.
 */

export const THEME_STORAGE_KEY = 'mrs.theme';
export const BRAND_STORAGE_KEY = 'mrs.brand';

/* ------------------------------------------------------------------ colour */

export function hexToRgb(hex) {
  const clean = String(hex || '').replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }) {
  const to = (v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export function rgbToHsl({ r, g, b }) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToRgb({ h, s, l }) {
  const hn = ((h % 360) + 360) % 360 / 360;
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;

  if (sn === 0) {
    const v = Math.round(ln * 255);
    return { r: v, g: v, b: v };
  }

  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  const channel = (t) => {
    let tn = t;
    if (tn < 0) tn += 1;
    if (tn > 1) tn -= 1;
    if (tn < 1 / 6) return p + (q - p) * 6 * tn;
    if (tn < 1 / 2) return q;
    if (tn < 2 / 3) return p + (q - p) * (2 / 3 - tn) * 6;
    return p;
  };

  return {
    r: Math.round(channel(hn + 1 / 3) * 255),
    g: Math.round(channel(hn) * 255),
    b: Math.round(channel(hn - 1 / 3) * 255),
  };
}

const triplet = ({ r, g, b }) => `${r} ${g} ${b}`;

/** Lightness targets that keep contrast usable in both themes. */
const RAMP = {
  50: { l: 97, s: 0.55 },
  100: { l: 93, s: 0.7 },
  200: { l: 86, s: 0.8 },
  300: { l: 76, s: 0.9 },
  400: { l: 64, s: 1 },
  500: { l: 52, s: 1 },
  600: { l: 43, s: 1.02 },
  700: { l: 35, s: 1.04 },
  800: { l: 28, s: 1.02 },
  900: { l: 21, s: 0.98 },
};

/**
 * Builds a 50..900 ramp around a base colour. The base hue is preserved and
 * the input colour's own lightness nudges the ramp so a very dark or very
 * light brand colour still produces a sensible scale.
 */
export function buildRamp(hex, fallbackHex = '#0f766e') {
  const rgb = hexToRgb(hex) || hexToRgb(fallbackHex);
  const base = rgbToHsl(rgb);
  const saturation = clamp(base.s < 12 ? base.s + 8 : base.s, 8, 92);

  const ramp = {};
  for (const [step, { l, s }] of Object.entries(RAMP)) {
    ramp[step] = hslToRgb({ h: base.h, s: clamp(saturation * s, 6, 96), l });
  }
  return ramp;
}

/** Relative luminance -> pick black or white text on top of a colour. */
export function readableInk(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#ffffff';
  const channel = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
  return luminance > 0.5 ? '#0f172a' : '#ffffff';
}

/* ------------------------------------------------------------------ apply */

/**
 * Writes the brand + accent ramps onto the document root.
 *
 * @param {{ primary?: string, accent?: string }} colors
 * @param {{ persist?: boolean }} [options] persist:true also caches the
 *   computed variables, so the very next page load paints in the hospital's
 *   colours before the API has answered - including on the sign-in page.
 *   Live previews in Settings pass persist:false so an unsaved colour never
 *   leaks into the next session.
 */
export function applyBrandColors({ primary, accent } = {}, { persist = false } = {}) {
  const root = document.documentElement;
  const vars = {};

  if (primary) {
    const ramp = buildRamp(primary, '#0f766e');
    for (const [step, rgb] of Object.entries(ramp)) {
      vars[`--brand-${step}`] = triplet(rgb);
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', primary);
  }

  if (accent) {
    const ramp = buildRamp(accent, '#0284c7');
    for (const step of [100, 300, 500, 600, 700]) {
      vars[`--accent-${step}`] = triplet(ramp[step]);
    }
  }

  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value);
  }

  if (persist && Object.keys(vars).length) {
    try {
      localStorage.setItem(BRAND_STORAGE_KEY, JSON.stringify({ primary, accent, vars }));
    } catch {
      /* private mode - the colours simply re-fetch next time */
    }
  }
}

/** The last colours we successfully applied, if any. */
export function loadCachedBrand() {
  try {
    const raw = localStorage.getItem(BRAND_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * @param {{mode?: 'light'|'dark'|'system', density?: string, radius?: number, fontScale?: number}} prefs
 */
export function applyPreferences(prefs = {}) {
  const root = document.documentElement;
  const { mode = 'system', density = 'comfortable', radius = 1, fontScale = 1 } = prefs;

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const resolved = mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode;

  root.dataset.theme = resolved;
  root.dataset.density = density;
  root.style.setProperty('--radius-scale', String(radius));
  root.style.setProperty('--font-scale', String(fontScale));

  return resolved;
}

export function loadPreferences() {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function savePreferences(prefs) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* private mode - preferences simply do not persist */
  }
}

export const DENSITIES = [
  { value: 'compact', label: 'Compact' },
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'relaxed', label: 'Relaxed' },
];

export const MODES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

/** Ready-made brand colours offered in Settings. */
export const BRAND_PRESETS = [
  { name: 'Teal', primary: '#0f766e', accent: '#0284c7' },
  { name: 'Clinical Blue', primary: '#1d4ed8', accent: '#0891b2' },
  { name: 'Emerald', primary: '#047857', accent: '#65a30d' },
  { name: 'Indigo', primary: '#4338ca', accent: '#7c3aed' },
  { name: 'Maroon', primary: '#9f1239', accent: '#b45309' },
  { name: 'Slate', primary: '#334155', accent: '#0f766e' },
];
