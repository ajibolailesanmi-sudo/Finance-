import type { Config } from "tailwindcss";

// Design tokens (brief §6). Edit colors here or in globals.css :root.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        surface: "var(--surface)",
        ink: "var(--ink)",
        graphite: "var(--graphite)",
        signal: "var(--signal)",
        "signal-ink": "var(--signal-ink)",
        trace: "var(--trace)",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      maxWidth: { wrap: "1120px" },
    },
  },
  plugins: [],
};
export default config;
