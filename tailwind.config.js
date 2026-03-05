/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'kfc-red': '#E4002B',
        'kfc-dark': '#202124',
        'kfc-gray': '#F8F9FA'
      },
      fontFamily: {
        'sans': ['"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
