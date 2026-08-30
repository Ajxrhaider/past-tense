import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',
        'dark-bg': '#1a1a2e',
        'card-bg': '#2a2a3e',
      }
    },
  },
  plugins: [],
};
export default config;