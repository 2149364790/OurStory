/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        romantic: {
          50: '#fff0f3',
          100: '#ffccd5',
          200: '#ffb3c1',
          300: '#ff85a1',
          400: '#ff4d6d',
          500: '#c9184a',
          600: '#a4133c',
          700: '#800f2f',
          800: '#590d22',
        },
        warm: {
          50: '#fffbf0',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
        },
        pastel: {
          purple: '#eae2f8',
          lavender: '#d6c7f5',
          pink: '#fce7f3',
          rose: '#ffe4e6',
        }
      },
      fontFamily: {
        handwritten: ['"Pacifico"', 'cursive', 'system-ui'],
        sans: ['"Inter"', '"Noto Sans SC"', 'sans-serif'],
      },
      animation: {
        'heartbeat': 'heartbeat 1.5s ease-in-out infinite',
        'float-up': 'floatUp 4s ease-in-out infinite',
        'spin-slow': 'spin 12s linear infinite',
      },
      keyframes: {
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.15)' },
        },
        floatUp: {
          '0%': { transform: 'translateY(100vh) scale(0.5)', opacity: '0' },
          '10%': { opacity: '0.8' },
          '90%': { opacity: '0.8' },
          '100%': { transform: 'translateY(-10vh) scale(1.2)', opacity: '0' }
        }
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
