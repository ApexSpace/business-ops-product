"use client";

import { useEffect, useState } from "react";
import { isApplePlatform } from "@/lib/utils/keyboard";
import { cn } from "@/lib/utils";

interface KeyboardShortcutBadgeProps {
  macKeys: string;
  windowsKeys: string;
  className?: string;
}

export function KeyboardShortcutBadge({
  macKeys,
  windowsKeys,
  className,
}: KeyboardShortcutBadgeProps) {
  const [isApple, setIsApple] = useState(false);

  useEffect(() => {
    setIsApple(isApplePlatform());
  }, []);

  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "pointer-events-none hidden shrink-0 rounded border border-border/80 bg-muted/50 px-1.5 py-0.5 font-sans text-[10px] font-medium leading-none text-muted-foreground sm:inline-block",
        className,
      )}
    >
      {isApple ? macKeys : windowsKeys}
    </kbd>
  );
}
