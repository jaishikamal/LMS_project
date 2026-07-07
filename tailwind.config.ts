import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        "kamal-sky": "#C3EBFA",
        "kamal-sky-light": "#EDF9FD",
        "kamal-purple": "#CFCEFF",
        "kamal-purple-light": "#F1F0FF",
        "kamal-yellow": "#FAE27C",
        "kamal-yellow-light": "#FEFCE8",
      },
    },
  },
  plugins: [],
};

export default config;
