/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0A0A0D",
        panel: "#121218",
        border: "rgba(255,255,255,0.08)",
        accent: "#7B5CFF",
        "accent-soft": "rgba(123,92,255,0.15)",
        ink: "#EDEDF2",
        muted: "#8B8B99",
      },
      fontFamily: {
        sans: ["Manrope", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
