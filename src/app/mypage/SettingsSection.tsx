"use client";

import { Moon, Sun, Laptop } from "lucide-react";
import { useTheme } from "next-themes";

const THEMES = ["light", "dark", "system"] as const;
type Theme = (typeof THEMES)[number];

export function SettingsSection() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const handleThemeChange = (value: string) => {
    if (THEMES.includes(value as Theme)) {
      setTheme(value);
    }
  };

  const isMounted = !!resolvedTheme;

  // Render a consistent wrapper to avoid layout shifts
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold px-2">設定</h2>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 flex items-center justify-center">
              {!isMounted ? (
                <div className="w-5 h-5" />
              ) : theme === "system" ? (
                <Laptop className="w-5 h-5" data-testid="theme-icon-laptop" />
              ) : resolvedTheme === "dark" ? (
                <Moon className="w-5 h-5" data-testid="theme-icon-moon" />
              ) : (
                <Sun className="w-5 h-5" data-testid="theme-icon-sun" />
              )}
            </div>
            <span>テーマ切り替え</span>
          </div>

          {!isMounted ? (
            <div className="w-24 h-8 bg-secondary rounded animate-pulse" />
          ) : (
            <select
              value={theme ?? "system"}
              onChange={(e) => handleThemeChange(e.target.value)}
              className="bg-secondary text-sm rounded px-3 py-1.5 border-none focus:ring-2 focus:ring-ring cursor-pointer outline-none"
              aria-label="テーマを選択"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          )}
        </div>
      </div>
    </div>
  );
}
