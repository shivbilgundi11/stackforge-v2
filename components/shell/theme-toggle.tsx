"use client";

import { useTheme } from "next-themes";
import { LaptopIcon, MoonIcon, SunIcon } from "lucide-react";

import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "system", label: "System", Icon: LaptopIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
] as const;

/**
 * A three-state segmented control rather than a two-state switch.
 *
 * "System" is a real preference, not the absence of one, and a binary toggle
 * silently discards it the first time the user clicks.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  // The server cannot know the resolved theme, so no segment is marked active
  // until hydration — otherwise the wrong one flashes on first paint.
  const mounted = useMounted();

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="flex items-center gap-0.5 rounded-sm border border-line bg-surface-2 p-0.5"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              "flex size-6 items-center justify-center rounded-xs transition-colors duration-150",
              active ? "bg-surface text-fg shadow-panel" : "text-fg-subtle hover:text-fg-muted",
            )}
          >
            <Icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}
