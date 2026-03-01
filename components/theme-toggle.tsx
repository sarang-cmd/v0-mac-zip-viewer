"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "./mac-icons";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-[72px] h-7" />;

  const options = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "system", icon: Monitor, label: "Auto" },
  ] as const;

  return (
    <div className="flex items-center bg-[hsl(var(--mac-hover))] rounded-md p-0.5" role="radiogroup" aria-label="Theme">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          role="radio"
          aria-checked={theme === value}
          onClick={() => setTheme(value)}
          className={`flex items-center justify-center w-6 h-6 rounded mac-transition ${
            theme === value
              ? "bg-[hsl(var(--mac-content))] shadow-sm text-[hsl(var(--mac-text-primary))]"
              : "text-[hsl(var(--mac-text-tertiary))] hover:text-[hsl(var(--mac-text-secondary))]"
          }`}
          title={label}
          aria-label={label}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}
    </div>
  );
}
