/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/views/**/*.ejs",
    "./src/public/**/*.{html,js}",
  ],
  theme: {
    extend: {
      colors: {
        teams: {
          dark: '#1c1c1c',
          darker: '#161616',
          sidebar: '#2b2b2b',
          purple: '#6264a7',
          blue: '#5b9bd5',
          accent: '#8b5fb8',
          hover: '#404040',
          border: '#404040',
          text: '#ffffff',
          muted: '#a8a8a8',
        }
      },
      fontFamily: {
        'teams': ['Segoe UI', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
  darkMode: 'class',
}