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
          bg:      '#121212',
        },
      },
    },
  },
  plugins: [],
}
