/**
 * Every colour below resolves to a CSS custom property, so the whole UI can
 * be re-skinned at runtime (light/dark, hospital brand colour, density)
 * without rebuilding a single class.
 */
const channel = (name) => `rgb(var(${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: channel('--brand-50'),
          100: channel('--brand-100'),
          200: channel('--brand-200'),
          300: channel('--brand-300'),
          400: channel('--brand-400'),
          500: channel('--brand-500'),
          600: channel('--brand-600'),
          700: channel('--brand-700'),
          800: channel('--brand-800'),
          900: channel('--brand-900'),
        },
        accent: {
          100: channel('--accent-100'),
          300: channel('--accent-300'),
          500: channel('--accent-500'),
          600: channel('--accent-600'),
          700: channel('--accent-700'),
        },
        surface: {
          DEFAULT: channel('--surface'),
          raised: channel('--surface-raised'),
          sunken: channel('--surface-sunken'),
          inverse: channel('--surface-inverse'),
        },
        ink: {
          DEFAULT: channel('--ink'),
          muted: channel('--ink-muted'),
          subtle: channel('--ink-subtle'),
          inverse: channel('--ink-inverse'),
        },
        line: {
          DEFAULT: channel('--line'),
          strong: channel('--line-strong'),
        },
        state: {
          success: channel('--success'),
          warning: channel('--warning'),
          danger: channel('--danger'),
          info: channel('--info'),
        },
      },
      borderRadius: {
        sm: 'calc(0.25rem * var(--radius-scale))',
        DEFAULT: 'calc(0.375rem * var(--radius-scale))',
        md: 'calc(0.5rem * var(--radius-scale))',
        lg: 'calc(0.75rem * var(--radius-scale))',
        xl: 'calc(1rem * var(--radius-scale))',
        '2xl': 'calc(1.25rem * var(--radius-scale))',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      fontSize: {
        xs: ['calc(0.75rem * var(--font-scale))', { lineHeight: '1.1rem' }],
        sm: ['calc(0.875rem * var(--font-scale))', { lineHeight: '1.3rem' }],
        base: ['calc(1rem * var(--font-scale))', { lineHeight: '1.5rem' }],
        lg: ['calc(1.125rem * var(--font-scale))', { lineHeight: '1.75rem' }],
        xl: ['calc(1.25rem * var(--font-scale))', { lineHeight: '1.85rem' }],
        '2xl': ['calc(1.5rem * var(--font-scale))', { lineHeight: '2rem' }],
        '3xl': ['calc(1.875rem * var(--font-scale))', { lineHeight: '2.35rem' }],
      },
      spacing: {
        row: 'var(--row-padding)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        pop: 'var(--shadow-pop)',
        focus: '0 0 0 3px rgb(var(--brand-500) / 0.28)',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'slide-up': {
          from: { opacity: 0, transform: 'translateY(8px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { opacity: 0, transform: 'translateX(16px)' },
          to: { opacity: 1, transform: 'translateX(0)' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in .18s ease-out',
        'slide-up': 'slide-up .22s cubic-bezier(.2,.8,.2,1)',
        'slide-in-right': 'slide-in-right .25s cubic-bezier(.2,.8,.2,1)',
      },
    },
  },
  plugins: [],
};
