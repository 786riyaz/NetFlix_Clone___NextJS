/** @type {import('tailwindcss').Config} */
module.exports = {
content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
theme: {
extend: {
colors: {
bg: "#0b0b0d",
panel: "#141416",
card: "#1a1a1d",
accent: "#e50914",
accent2: "#f6121d",
muted: "#9aa0a6",
},
fontFamily: {
sans: ["Inter", "Helvetica Neue", "Arial", "sans-serif"],
},
boxShadow: {
card: "0 12px 30px rgba(0,0,0,0.55)",
},
},
},
plugins: [],
};