/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#0f172a',
        accent: '#22c55e',
        page: 'var(--color-page)',
        card: 'var(--color-card)',
        'card-hover': 'var(--color-card-hover)',
        elevated: 'var(--color-elevated)',
        'elevated-hover': 'var(--color-elevated-hover)',
        heading: 'var(--color-heading)',
        body: 'var(--color-body)',
        'txt-secondary': 'var(--color-secondary)',
        muted: 'var(--color-muted)',
        faint: 'var(--color-faint)',
        subtle: 'var(--color-border)',
        inset: 'var(--color-inset)',
        banner: 'var(--color-banner)',
      },
    },
  },
  plugins: [],
}

