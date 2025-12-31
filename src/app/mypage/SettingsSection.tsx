"use client";

import { Moon, Sun, Laptop } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function SettingsSection() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold px-2">設定</h2>
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5" />
              <span>テーマ切り替え</span>
            </div>
            <div className="w-20 h-8 bg-secondary rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold px-2">設定</h2>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* General Settings - Hidden as per requirements */}
        {/* 
        <div className="p-4 flex items-center justify-between border-b border-border opacity-50">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5" />
            <span>一般設定</span>
          </div>
          <span className="text-xs bg-secondary px-2 py-1 rounded">
            準備中
          </span>
        </div>
        */}

        {/* Theme Switcher */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 flex items-center justify-center">
              {theme === "dark" ? (
                <Moon className="w-5 h-5" />
              ) : theme === "light" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Laptop className="w-5 h-5" />
              )}
            </div>
            <span>テーマ切り替え</span>
          </div>

          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="bg-secondary text-sm rounded px-3 py-1.5 border-none focus:ring-2 focus:ring-ring cursor-pointer outline-none"
            aria-label="テーマを選択"
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>
    </div>
  );
}
