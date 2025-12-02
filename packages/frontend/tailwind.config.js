/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f7fa',
          100: '#eaeef4',
          200: '#d0dae7',
          300: '#a7bbd2',
          400: '#7896b9',
          500: '#5678a2',
          600: '#435f88',
          700: '#374d6f',
          800: '#30415d',
          900: '#2b384f',
        },
      },
    },
  },
  plugins: [],
}
