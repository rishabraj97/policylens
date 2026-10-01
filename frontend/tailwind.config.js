/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#050816',
          'bg-secondary': '#0B1020',
          card: '#0F172A',
          'card-elevated': '#111C32',
          'card-hover': '#16223D',
          border: 'rgba(148, 163, 184, 0.12)',
          'border-light': 'rgba(148, 163, 184, 0.2)',
        },
        neon: {
          cyan: '#00F5D4',
          blue: '#00C2FF',
          purple: '#7C3AED',
          green: '#22C55E',
          amber: '#F59E0B',
          rose: '#EF4444',
        },
        brand: {
          50: '#f0fdf9',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#00F5D4',
          600: '#00C2FF',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#050816',
        },
      },
      boxShadow: {
        'neon-cyan': '0 0 20px -2px rgba(0, 245, 212, 0.35)',
        'neon-cyan-sm': '0 0 10px -1px rgba(0, 245, 212, 0.3)',
        'neon-blue': '0 0 20px -2px rgba(0, 194, 255, 0.35)',
        'neon-purple': '0 0 20px -2px rgba(124, 58, 237, 0.35)',
        'neon-green': '0 0 20px -2px rgba(34, 197, 94, 0.35)',
        'neon-amber': '0 0 20px -2px rgba(245, 158, 11, 0.35)',
        'neon-rose': '0 0 20px -2px rgba(239, 68, 68, 0.35)',
        'cyber-card': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-glow': 'pulseGlow 2.5s ease-in-out infinite alternate',
        'float': 'float 5s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s infinite linear',
      },
      keyframes: {
        pulseGlow: {
          '0%': { opacity: '0.4', filter: 'drop-shadow(0 0 8px rgba(0, 245, 212, 0.4))' },
          '100%': { opacity: '0.9', filter: 'drop-shadow(0 0 16px rgba(0, 245, 212, 0.8))' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
