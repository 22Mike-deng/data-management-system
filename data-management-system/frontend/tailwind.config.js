/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6C8AE1',
          light: '#B7C5ED',
          dark: '#4A6BC8',
        },
        background: {
          DEFAULT: '#F3F3F3',
          white: '#FFFFFF',
          card: '#F5F7FA',
        },
        text: {
          primary: 'rgba(0, 0, 0, 0.85)',
          secondary: 'rgba(0, 0, 0, 0.5)',
          disabled: 'rgba(0, 0, 0, 0.25)',
        },
        success: '#00A870',
        warning: '#ED7B2F',
        danger: '#E34D59',
      },
    },
  },
  plugins: [],
}
