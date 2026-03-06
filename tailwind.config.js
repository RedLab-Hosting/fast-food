/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'kfc-red': '#E4002B',
        'kfc-dark': '#1A1A2E',
        'kfc-gray': '#F0F2F5',
        'brand': {
          50: '#FFF5F5',
          100: '#FFE3E3',
          200: '#FFC9C9',
          300: '#FFA8A8',
          400: '#FF6B6B',
          500: '#E4002B',
          600: '#C92A2A',
          700: '#A61E1E',
          800: '#862020',
          900: '#5C1515',
        },
        'dark': {
          50: '#E8E8F0',
          100: '#D1D1E0',
          200: '#A3A3C2',
          300: '#7575A3',
          400: '#474766',
          500: '#1A1A2E',
          600: '#161628',
          700: '#111122',
          800: '#0D0D1B',
          900: '#080815',
        }
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        'display': ['"Playfair Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 12px 24px rgba(0, 0, 0, 0.1), 0 4px 8px rgba(0, 0, 0, 0.06)',
        'float': '0 8px 32px rgba(228, 0, 43, 0.3)',
        'glow': '0 0 20px rgba(228, 0, 43, 0.15)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}
