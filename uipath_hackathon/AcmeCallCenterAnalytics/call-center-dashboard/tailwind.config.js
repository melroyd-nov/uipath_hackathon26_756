/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* Semantic aliases (backward-compat with existing classes) */
        obsidian: 'var(--color-obsidian)',
        graphite: 'var(--color-graphite)',
        slate: 'var(--color-slate)',
        mist: 'var(--color-mist)',
        silver: 'var(--color-silver)',
        bone: 'var(--color-bone)',
        paper: 'var(--color-paper)',
        'lilac-bloom': 'var(--color-lilac-bloom)',
        blush: 'var(--color-blush)',
        'sky-veil': 'var(--color-sky-veil)',
        'sage-bloom': 'var(--color-sage-bloom)',
        'moss-veil': 'var(--color-moss-veil)',
        /* Brand tokens */
        brand: {
          primary: 'var(--color-brand-primary)',
          dark: 'var(--color-brand-dark)',
          deep: 'var(--color-brand-deep)',
          navy: 'var(--color-brand-navy)',
          blue: 'var(--color-brand-blue)',
        },
        action: {
          blue: 'var(--color-action-blue)',
        },
        /* Status */
        status: {
          live: 'var(--color-status-live)',
          'live-bg': 'var(--color-status-live-bg)',
          hold: 'var(--color-status-hold)',
          'hold-bg': 'var(--color-status-hold-bg)',
          escalated: 'var(--color-status-escalated)',
          'escalated-bg': 'var(--color-status-escalated-bg)',
          resolved: 'var(--color-status-resolved)',
          'resolved-bg': 'var(--color-status-resolved-bg)',
        },
      },
      fontFamily: {
        sans: ['var(--font-switzer)'],
        editorial: ['var(--font-pp-editorial-new)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        card: 'var(--radius-cards)',
        'card-elevated': 'var(--radius-cards-elevated)',
        pill: 'var(--radius-pills)',
        badge: 'var(--radius-badges)',
        input: 'var(--radius-inputs)',
        button: 'var(--radius-buttons)',
      },
      boxShadow: {
        subtle: 'var(--shadow-subtle)',
        card: 'var(--shadow-md)',
        'brand-hover': '0 8px 24px rgba(15,31,76,0.14), 0 2px 6px rgba(15,31,76,0.08)',
        'ai-card': '0 2px 10px rgba(30,94,172,0.08)',
        panel: '0 2px 16px rgba(15,31,76,0.07)',
      },
      backgroundColor: {
        canvas: 'var(--surface-canvas)',
      },
    },
  },
  plugins: [],
};
