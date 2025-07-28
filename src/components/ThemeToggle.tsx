// src/components/ThemeToggle.tsx
"use client";

import { useEffect, useState } from "react";

type ThemeType = "light" | "dark" | "system";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeType>("system");

  // Pega preferência sistema (light/dark)
  const getSystemTheme = (): "light" | "dark" =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";

  // Aplica o tema atual (considerando system)
  const applyTheme = (theme: ThemeType) => {
    const actual = theme === "system" ? getSystemTheme() : theme;
    document.documentElement.classList.toggle("dark", actual === "dark");
  };

  useEffect(() => {
    // carrega escolha salva ou default “system”
    const saved = localStorage.getItem("theme") as ThemeType | null;
    const initial: ThemeType = saved || "system";
    setTheme(initial);
    applyTheme(initial);

    // re-aplica quando muda preferência do sistema (se mode=system)
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (theme === "system") applyTheme("system");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTheme = e.target.value as ThemeType;
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
  };

  return (
    <select
      value={theme}
      onChange={handleChange}
      className="border px-2 py-1 rounded text-sm text-[var(--foreground)] bg-transparent"
    >
      <option value="light">☀️ Claro</option>
      <option value="dark">🌙 Escuro</option>
      <option value="system">🖥️ Sistema</option>
    </select>
  );
}
