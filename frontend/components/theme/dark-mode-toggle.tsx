"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface DarkModeToggleProps {
  variant?: "icon" | "switch";
  className?: string;
}

export function DarkModeToggle({
  variant = "icon",
  className,
}: DarkModeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  const toggle = () => setTheme(isDark ? "light" : "dark");

  if (!mounted) {
    return variant === "icon" ? (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={className}
        aria-label="Toggle dark mode"
        disabled
      >
        <Sun className="size-4" />
      </Button>
    ) : (
      <div
        className={cn(
          "flex items-center justify-between rounded-md border p-4 opacity-50",
          className,
        )}
      >
        <div>
          <p className="text-sm font-medium">Dark mode</p>
          <p className="text-xs text-muted-foreground">Use a dark color theme</p>
        </div>
        <div className="size-4 rounded-full border" />
      </div>
    );
  }

  if (variant === "switch") {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label="Toggle dark mode"
        onClick={toggle}
        className={cn(
          "flex w-full items-center justify-between rounded-md border p-4 text-left transition-colors hover:bg-muted/50",
          className,
        )}
      >
        <div className="flex items-center gap-3">
          {isDark ? (
            <Moon className="size-4 text-muted-foreground" />
          ) : (
            <Sun className="size-4 text-muted-foreground" />
          )}
          <div>
            <p className="text-sm font-medium">Dark mode</p>
            <p className="text-xs text-muted-foreground">
              {isDark ? "Dark theme enabled" : "Light theme enabled"}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 rounded-full border transition-colors",
            isDark ? "border-primary bg-primary" : "border-input bg-muted",
          )}
        >
          <span
            className={cn(
              "pointer-events-none block size-4 translate-y-0.5 rounded-full bg-background shadow-sm transition-transform",
              isDark ? "translate-x-4" : "translate-x-0.5",
            )}
          />
        </span>
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={className}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

export function DarkModeMenuItem() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <DropdownMenuCheckboxItem checked={false} disabled>
        <Moon className="size-4" />
        Dark mode
      </DropdownMenuCheckboxItem>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <DropdownMenuCheckboxItem
      checked={isDark}
      onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
    >
      <Moon className="size-4" />
      Dark mode
    </DropdownMenuCheckboxItem>
  );
}
