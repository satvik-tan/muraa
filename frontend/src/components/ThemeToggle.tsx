"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("muraa-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldUseDark = savedTheme ? savedTheme === "dark" : prefersDark;
    setIsDark(shouldUseDark);
    if (shouldUseDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", isDark);
    window.localStorage.setItem("muraa-theme", isDark ? "dark" : "light");
  }, [isDark, mounted]);

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light theme" : "Dark theme"}
      onClick={() => setIsDark((v) => !v)}
      className="fixed bottom-5 right-5 z-50 h-9 w-9 rounded-full border-2 border-black bg-primary text-primary-foreground transition-all duration-200 hover:scale-110 focus-visible:outline-2 focus-visible:outline-black focus-visible:outline-offset-2"
      style={{ boxShadow: "0 0 0 2px var(--background)" }}
    >
      <span className="sr-only">Toggle theme</span>
      {isDark ? <Sun className="mx-auto h-4 w-4" /> : <Moon className="mx-auto h-4 w-4" />}
    </button>
  );
}
