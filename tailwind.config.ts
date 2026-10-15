import type { Config } from 'tailwindcss'

export default {
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue',
  ],
  theme: {
    extend: {
      colors: {
        paper: 'rgb(var(--paper-rgb) / <alpha-value>)',
        'surface-2': 'var(--surface-2)',
        surface: 'var(--surface)',
        jungle: 'rgb(var(--jungle-rgb) / <alpha-value>)',

        olive: {
          DEFAULT: 'var(--olive)',
          dark: 'var(--olive-dark)',
          light: 'var(--olive-light)',
        },
        honey: 'rgb(var(--honey-rgb) / <alpha-value>)',

        moss: {
          DEFAULT: 'rgb(var(--moss-rgb) / <alpha-value>)',
          soft: 'var(--moss-soft)',
          ghost: 'var(--moss-ghost)',
        },

        terracotta: 'var(--terracotta)',
      },

      fontFamily: {
        display: ['DM Serif Display', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Geist', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },

      fontSize: {
        eyebrow: ['10px', { lineHeight: '1', letterSpacing: '0.14em' }],
        label: ['13px', { lineHeight: '16px' }],
        body: ['14px', { lineHeight: '22px' }],

        'mono-data': ['11px', { lineHeight: '14px' }],

        'display-m': ['30px', { lineHeight: '28px' }],
        'display-l': ['38px', { lineHeight: '35px', letterSpacing: '-0.01em' }],
        'display-xl': ['56px', { lineHeight: '52px', letterSpacing: '-0.02em' }],
      },

      spacing: {
        // Sorbo named scale aliases (4 / 8 / 12 / 16 / 24 / 40 / 64 / 80)
        xxs: '4px',
        xs: '8px',
        sm: '12px',
        md: '16px',
        lg: '24px',
        xl: '40px',
        '2xl': '64px',
        '3xl': '80px',
      },

      borderRadius: {
        input: '8px',
        'card-sm': '12px',
        cta: '14px',
        card: '14px',
        'card-lg': '18px',
        sheet: '24px',
        pill: '9999px',
      },

      letterSpacing: {
        eyebrow: '0.14em',
      },

      transitionTimingFunction: {
        sorbo: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config
