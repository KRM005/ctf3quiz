/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#00b4ff",
        "primary-dark": "#0090cc",
        background: "#0a0a0a",
        surface: "#121212",
        "surface-light": "#1e1e1e",
        text: "#ffffff",
        "text-secondary": "rgba(255, 255, 255, 0.7)",
      },
    },
  },
  plugins: [],
}