/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#e6a817",
          dark: "#c99212",
        },
        dark: {
          DEFAULT: "#1b1b1b",
          soft: "#2a2a2a",
        },
        warm: {
          DEFAULT: "var(--border-warm)",
          strong: "var(--border-warm-strong)",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      maxWidth: {
        site: "80rem",
      },
      screens: {
        xs: "480px",
      },
    },
  },
  plugins: [],
};
