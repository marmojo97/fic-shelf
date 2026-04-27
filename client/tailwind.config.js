/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base:    '#F5F3EE',
        surface: '#FFFFFF',
        elevated:'#F0EEE4',
        card:    '#FFFFFF',
        border: {
          subtle:  '#E5E1DB',
          DEFAULT: '#C8C3BB',
        },
        accent: {
          DEFAULT: '#990000',
          dim:     '#770000',
          muted:   'rgba(153,0,0,0.10)',
        },
        txt: {
          primary:   '#1A1A1A',
          secondary: '#4A4A4A',
          muted:     '#888888',
        },
        status: {
          complete:      '#276427',
          'in-progress': '#B07A00',
          abandoned:     '#6B7280',
          dnf:           '#6D28D9',
          rereading:     '#1D4ED8',
        },
        rating: {
          G: '#276427',
          T: '#1D4ED8',
          M: '#B05000',
          E: '#CC0000',
        },
      },
      fontFamily: {
        sans:  ['Roboto', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Roboto', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      animation: {
        'slide-in-right': 'slideInRight 0.25s ease-out',
        'fade-in':        'fadeIn 0.2s ease-out',
        'slide-up':       'slideUp 0.25s ease-out',
      },
      keyframes: {
        slideInRight: {
          from: { transform: 'translateX(100%)' },
          to:   { transform: 'translateX(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
