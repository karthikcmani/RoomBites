/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--bg-canvas)',
        surface: 'var(--bg-surface)',
        'surface-elevated': 'var(--bg-elevated)',
        'surface-muted': 'var(--bg-muted)',
        'border-subtle': 'var(--border-subtle)',
        'border-strong': 'var(--border-strong)',
        'text-main': 'var(--text-primary)',
        'text-muted': 'var(--text-secondary)',
        'text-dim': 'var(--text-tertiary)',
        accent: 'var(--accent-primary)',
        'accent-hover': 'var(--accent-hover)',
        'accent-surface': 'var(--accent-surface)',
        'accent-text': 'var(--accent-text)',
        brand: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        slate: {
          850: '#151e2e',
          950: '#070d18'
        }
      }
    },
  },
  plugins: [],
}
