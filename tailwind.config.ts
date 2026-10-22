import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: "#eef6f4", 100: "#d5ebe6", 500: "#1f7a6b", 600: "#18675a", 700: "#12534a" },
      },
    },
  },
  plugins: [],
};

export default config;
