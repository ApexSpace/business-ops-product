"use client";

import { Search } from "lucide-react";
import { KeyboardShortcutBadge } from "@/components/ui/keyboard-shortcut-badge";
import { cn } from "@/lib/utils";

interface AppSearchBarProps {
  className?: string;
  placeholder?: string;
  onClick?: () => void;
}

export function AppSearchBar({
  className,
  placeholder = "Search…",
  onClick,
}: AppSearchBarProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open search"
      aria-keyshortcuts="Control+K Meta+K"
      className={cn(
        "glass-control glass-hover flex h-[42px] w-[260px] max-w-full cursor-pointer items-center gap-2 rounded-full border-[color:var(--glass-border)] px-3.5 text-left text-[13px] text-[#98a1b5] shadow-[0_4px_24px_rgba(18,23,43,0.05)] hover:bg-white/78 hover:text-[#5b6478] dark:hover:bg-white/8",
        className,
      )}
    >
      <Search className="size-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{placeholder}</span>
      <KeyboardShortcutBadge macKeys="⌘K" windowsKeys="Ctrl K" />
    </button>
  );
}
