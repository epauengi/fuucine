import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

function getIsDarkTheme() {
  return document.documentElement.dataset.theme !== "light";
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(getIsDarkTheme);

  useEffect(() => {
    setIsDark(getIsDarkTheme());
  }, []);

  const toggleTheme = () => {
    setIsDark((value) => {
      const isNextDark = !value;
      const theme = isNextDark ? "dark" : "light";

      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
      window.localStorage.setItem("theme", theme);

      return isNextDark;
    });
  };

  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]",
        isDark
          ? "border-white/15 bg-black/25 text-[#D4D4D8] hover:border-[#00F0FF]/45 hover:text-white"
          : "border-slate-900/15 bg-white/70 text-slate-800 hover:border-[#008EA0]/45",
        className,
      )}
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
    >
      {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      <span>{isDark ? "Tối" : "Sáng"}</span>
    </button>
  );
}
