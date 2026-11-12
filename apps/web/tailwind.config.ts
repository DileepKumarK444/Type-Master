import type { Config } from "tailwindcss";

// All colours come from CSS variables in styles/tokens.css so themes swap at runtime.
const v = (n: string) => `rgb(var(--${n}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./features/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: v("bg"), surface: v("surface"), surface2: v("surface2"), line: v("line"),
        fg: v("fg"), muted: v("muted"), accent: v("accent"), "accent-soft": v("accent-soft"),
        ok: v("ok"), bad: v("bad"), warn: v("warn"),
      },
      borderRadius: { token: "var(--radius)" },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
