/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: 'var(--color-obsidian)',
        graphite: 'var(--color-graphite)',
        slate: 'var(--color-slate)',
        mist: 'var(--color-mist)',
        silver: 'var(--color-silver)',
        bone: 'var(--color-bone)',
        paper: 'var(--color-paper)',
        'lilac-bloom': 'var(--color-lilac-bloom)',
        'sky-veil': 'var(--color-sky-veil)',
        'sage-bloom': 'var(--color-sage-bloom)',
        'moss-veil': 'var(--color-moss-veil)',
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
      },
      backgroundColor: {
        canvas: 'var(--surface-canvas)',
      },
    },
  },
  plugins: [],
};
