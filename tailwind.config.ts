import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Terminal dark palette
        surface: {
          DEFAULT: "#0d0d14",
          raised: "#12121c",
          border: "#1e1e2e",
          muted: "#252535",
        },
        bull: {
          DEFAULT: "#22c55e",
          dim: "#166534",
          glow: "rgba(34,197,94,0.15)",
        },
        bear: {
          DEFAULT: "#ef4444",
          dim: "#7f1d1d",
          glow: "rgba(239,68,68,0.15)",
        },
        signal: {
          gold: "#f59e0b",
          cyan: "#06b6d4",
          purple: "#a855f7",
          violet: "#7c3aed",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "flash-bull": "flashBull 0.4s ease-out",
        "flash-bear": "flashBear 0.4s ease-out",
        ticker: "ticker 30s linear infinite",
      },
      keyframes: {
        flashBull: {
          "0%": { backgroundColor: "rgba(34,197,94,0.3)" },
          "100%": { backgroundColor: "transparent" },
        },
        flashBear: {
          "0%": { backgroundColor: "rgba(239,68,68,0.3)" },
          "100%": { backgroundColor: "transparent" },
        },
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
