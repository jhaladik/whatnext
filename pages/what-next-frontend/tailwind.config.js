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
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          900: '#1e3a8a',
        },
        accent: {
          yellow: '#fbbf24',
          pink: '#ec4899',
          green: '#10b981',
        }
      },
      animation: {
        'swipe-left': 'swipeLeft 0.5s ease-out',
        'swipe-right': 'swipeRight 0.5s ease-out',
      },
      keyframes: {
        swipeLeft: {
          '0%': { transform: 'translateX(0) rotate(0deg)', opacity: 1 },
          '100%': { transform: 'translateX(-150%) rotate(-30deg)', opacity: 0 },
        },
        swipeRight: {
          '0%': { transform: 'translateX(0) rotate(0deg)', opacity: 1 },
          '100%': { transform: 'translateX(150%) rotate(30deg)', opacity: 0 },
        },
      },
    },
  },
  plugins: [],
}