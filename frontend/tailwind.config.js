/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nature: {
          50: '#f4f8f3',
          100: '#e4eddf',
          200: '#c8dcbf',
          300: '#a3c495',
          400: '#79a76a',
          500: '#558b47',
          600: '#3f7035',
          700: '#237a4b', // Primary green
          800: '#174a32', // Deep green
          900: '#0e2e1f',
        },
        water: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#2997c8', // Water accent
          600: '#0284c7',
          700: '#0369a1',
        },
        cream: {
          50: '#fdfcf9',
          100: '#f7f5ed', // Warm cream
          200: '#eee8d5',
          300: '#e3d9bb',
        },
        sage: '#e4eddf',
      },
      fontFamily: {
        sans: ['DM Sans', 'Inter', 'system-ui', 'sans-serif'],
        heading: ['Manrope', 'DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
