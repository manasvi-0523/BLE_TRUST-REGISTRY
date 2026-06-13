import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        panel: "rgba(12, 18, 32, 0.78)",
        line: "rgba(148, 163, 184, 0.22)"
      },
      boxShadow: {
        glow: "0 0 40px rgba(56, 189, 248, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
