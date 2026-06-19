"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextIsDark = savedTheme ? savedTheme === "dark" : prefersDark;

    setIsDark(nextIsDark);
    document.documentElement.dataset.theme = nextIsDark ? "dark" : "light";
  }, []);

  const toggleTheme = () => {
    setIsDark((value) => {
      const nextIsDark = !value;
      const theme = nextIsDark ? "dark" : "light";

      document.documentElement.dataset.theme = theme;
      window.localStorage.setItem("theme", theme);

      return nextIsDark;
    });
  };

  // next-themes
  // const { resolvedTheme, setTheme } = useTheme()
  // const isDark = resolvedTheme === "dark"
  // onClick={() => setTheme(isDark ? "light" : "dark")}

  return (
    <div
      className={cn(
        "flex h-8 w-16 cursor-pointer rounded-full p-1 transition-all duration-300",
        isDark
          ? "border border-zinc-800 bg-zinc-950"
          : "border border-zinc-200 bg-white",
        className,
      )}
      onClick={toggleTheme}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggleTheme();
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={isDark}
      aria-label="Toggle theme"
    >
      <div className="flex w-full items-center justify-between">
        <div
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full transition-transform duration-300",
            isDark
              ? "translate-x-0 bg-zinc-800"
              : "translate-x-8 bg-gray-200",
          )}
        >
          {isDark ? (
            <Moon className="h-4 w-4 text-white" strokeWidth={1.5} />
          ) : (
            <Sun className="h-4 w-4 text-gray-700" strokeWidth={1.5} />
          )}
        </div>
        <div
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full transition-transform duration-300",
            isDark ? "bg-transparent" : "-translate-x-8",
          )}
        >
          {isDark ? (
            <Sun className="h-4 w-4 text-gray-500" strokeWidth={1.5} />
          ) : (
            <Moon className="h-4 w-4 text-black" strokeWidth={1.5} />
          )}
        </div>
      </div>
    </div>
  );
}
