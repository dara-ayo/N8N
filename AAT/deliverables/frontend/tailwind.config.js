/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'var(--color-surface)',
          secondary: 'var(--color-surface-secondary)',
          tertiary: 'var(--color-surface-tertiary)',
          elevated: 'var(--color-surface-elevated)',
          border: 'var(--color-surface-border)',
          'border-strong': 'var(--color-surface-border-strong)',
          hover: 'var(--color-surface-hover)',
        },
        accent: {
          DEFAULT: '#7c6af5',
          hover: '#9585f8',
          muted: 'rgba(124, 106, 245, 0.12)',
          'muted-hover': 'rgba(124, 106, 245, 0.18)',
          border: 'rgba(124, 106, 245, 0.25)',
          'border-hover': 'rgba(124, 106, 245, 0.45)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
          disabled: 'var(--color-text-disabled)',
          inverted: 'var(--color-text-inverted)',
        },
        status: {
          success: '#22c55e',
          'success-bg': 'rgba(34,197,94,0.10)',
          warning: '#f59e0b',
          'warning-bg': 'rgba(245,158,11,0.10)',
          error: '#ef4444',
          'error-bg': 'rgba(239,68,68,0.10)',
          info: '#3b82f6',
          'info-bg': 'rgba(59,130,246,0.10)',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          '"Fira Code"',
          '"Cascadia Code"',
          'monospace',
        ],
      },
      boxShadow: {
        'glow-accent': '0 0 20px rgba(124, 106, 245, 0.20)',
        'glow-sm': '0 0 8px rgba(124, 106, 245, 0.15)',
        'surface': 'var(--shadow-surface)',
        'surface-md': 'var(--shadow-surface-md)',
        'surface-lg': 'var(--shadow-surface-lg)',
        'modal': 'var(--shadow-modal)',
        'card-hover': 'var(--shadow-card-hover)',
        'glow-green': '0 0 12px rgba(34,197,94,0.18)',
        'glow-red': '0 0 12px rgba(239,68,68,0.18)',
        'sidebar': 'var(--shadow-sidebar)',
      },
      backgroundImage: {
        'gradient-surface': 'var(--bg-gradient-surface)',
        'gradient-accent': 'linear-gradient(135deg, #7c6af5 0%, #9585f8 100%)',
        'gradient-subtle': 'var(--bg-gradient-subtle)',
        'grid-pattern': 'radial-gradient(circle, rgba(124,106,245,0.06) 1px, transparent 1px)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
        'shimmer': 'shimmer 1.8s linear infinite',
        'progress': 'progress linear',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        progress: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
}
