"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AppSearchIconButtonProps {
  className?: string;
  onClick?: () => void;
}

export function AppSearchIconButton({
  className,
  onClick,
}: AppSearchIconButtonProps) {
  return (
    <Button
      type="button"
      variant="glass"
      size="icon-lg"
      onClick={onClick}
      aria-label="Open search"
      aria-keyshortcuts="Control+K Meta+K"
      className={cn(
        "size-[42px] shrink-0 rounded-full p-0",
        className,
      )}
    >
      <Search className="size-[17px] text-[#5b6478]" aria-hidden />
    </Button>
  );
}
