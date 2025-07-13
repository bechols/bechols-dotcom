import type { Config } from "@tailwindcss/vite";

export default {
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "williams-purple": "#500082",
      },
      fontFamily: {
        sans: ["DM Sans Variable", "sans-serif"],
        mono: ["JetBrains Mono Variable", "monospace"],
      },
    },
  },
  plugins: ["@tailwindcss/typography"],
} satisfies Config;
