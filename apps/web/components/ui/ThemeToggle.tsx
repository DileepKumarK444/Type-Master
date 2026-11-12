"use client";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    // The inline script in <head> already applied the theme; just sync our state with it.
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);
  const flip = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("tm-theme", next); } catch { /* ignore */ }
  };
  return (
    <button onClick={flip} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
      className="grid h-10 w-10 place-items-center rounded-token border border-line bg-surface text-muted hover:text-fg">
      <Icon name={theme === "light" ? "moon" : "sun"} />
    </button>
  );
}
