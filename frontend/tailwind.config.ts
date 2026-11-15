import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        discovery: {
          space: "#050B19",
          earth: "#158BE8",
          teal: "#30C7BA",
          surface: "#19263B",
        },
        space: {
          950: "#07090E",
          900: "#0D1117",
          850: "#131924",
          800: "#1B2232",
          700: "#27324A",
          600: "#3D4D6F",
        },
        nasa: {
          blue: "#0B3D91",
          red: "#FC3D21",
          cyan: "#00E5FF",
          emerald: "#10B981",
          amber: "#F59E0B",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "Courier New", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
