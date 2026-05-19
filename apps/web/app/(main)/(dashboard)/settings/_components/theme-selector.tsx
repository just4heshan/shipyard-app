"use client";

import { cn } from "@shipyard/ui/lib/utils";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const themes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Defer active-state class until client has resolved the saved theme.
  // Without this, server renders theme=undefined and client renders theme="system"
  // (or whatever's saved), producing a className mismatch.
  useEffect(() => setMounted(true), []);

  return (
    <div className="grid grid-cols-3 gap-3 max-w-sm">
      {themes.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          className={cn(
            "flex flex-col items-center gap-2 rounded-lg border p-4 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
            mounted && theme === value
              ? "border-primary bg-accent text-accent-foreground"
              : "border-border text-muted-foreground"
          )}
        >
          <Icon className="size-5" />
          {label}
        </button>
      ))}
    </div>
  );
}
