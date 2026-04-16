/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        base: '#0d1117',
        surface: '#161c27',
        elevated: '#1c2333',
        card: '#1e2438',
        border: {
          subtle: '#2a3347',
          DEFAULT: '#3a4558',
        },
        accent: {
          DEFAULT: '#14b8a6',
          dim: '#0d9488',
          muted: 'rgba(20,184,166,0.15)',
        },
        txt: {
          primary: '#f1f5f9',
          secondary: '#94a3b8',
          muted: '#64748b',
        },
        status: {
          complete: '#22c55e',
          'in-progress': '#eab308',
          abandoned: '#6b7280',
          dnf: '#a855f7',
          rereading: '#3b82f6',
        },
        rating: {
          G: '#22c55e',
          T: '#3b82f6',
          M: '#f97316',
          E: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'ui-serif', 'serif'],
      },
      animation: {
        'slide-in-right': 'slideInRight 0.25s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
      },
      keyframes: {
        slideInRight: {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
