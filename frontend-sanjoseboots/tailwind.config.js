/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a1a1a',
          light: '#2d2d2d',
          dark: '#000000',
        },
        accent: {
          DEFAULT: '#8B7355',
          light: '#A89080',
          dark: '#6B5644',
        },
        gold: {
          DEFAULT: '#D4AF37',
          light: '#E8D687',
          dark: '#B8941F',
        },
        background: {
          DEFAULT: '#F5F5F0',
          light: '#FFFFFF',
          dark: '#E5E5E0',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}