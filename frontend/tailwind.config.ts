import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#0a0a0a",
          panel: "#111111",
          elevated: "#1a1a1a",
          hover: "#222222",
        },
        accent: {
          DEFAULT: "#c9a96e",
          light: "#e0c28a",
          dark: "#a8854a",
        },
        muted: "#666666",
        border: "#2a2a2a",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
