import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        signal: {
          bg: "#0e1621",
          panel: "#1b2735",
          panelAlt: "#212f3d",
          border: "#2a3a4a",
          borderLight: "#3a4a5a",
          panelDark: "#141b22",
          text: "#e9edf1",
          subtext: "#8393a3",
          accent: "#2c6bed",
          accentHover: "#3b78f6",
          bubbleOut: "#2c6bed",
          bubbleIn: "#233648",
          online: "#33c481",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
