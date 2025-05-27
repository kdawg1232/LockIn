/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand colors based on existing design
        primary: {
          50: '#f9f7f4',
          100: '#f0ebe2',
          200: '#e1d4c0',
          300: '#cfb991', // Main brand color from existing screens
          400: '#c4a876',
          500: '#b8975b',
          600: '#a6844d',
          700: '#8a6d41',
          800: '#715a39',
          900: '#5d4a31',
        },
        // App-specific colors for easy reference
        brand: '#cfb991',
        'brand-light': '#f0ebe2',
        'brand-dark': '#8a6d41',
      },
    },
  },
  plugins: [],
} 