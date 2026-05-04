/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        app: {
          surface: '#1e1e2f',
          bg: '#121212',
        },
        myfinance: {
          green: '#5BAD8F',
          mint: '#E8F5EE',
          red: '#E57373',
          'green-dark': '#3D9970',
          'green-light': '#7CC4A4',
          border: '#C8D8CE',
          'text-primary': '#2D2D2D',
          'text-secondary': '#8A9A90',
        },
      },
    },
  },
  plugins: [],
}
