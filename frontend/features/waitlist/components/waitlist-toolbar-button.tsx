"use client";

import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWaitlistSummary } from "@/features/waitlist/hooks/use-waitlist-summary";
import { cn } from "@/lib/utils";

interface WaitlistToolbarButtonProps {
  onClick: () => void;
  className?: string;
}

export function WaitlistToolbarButton({
  onClick,
  className,
}: WaitlistToolbarButtonProps) {
  const { data: summary } = useWaitlistSummary();
  const matchedCount = summary?.matchedCount ?? 0;
  const totalCount = matchedCount + (summary?.waitingCount ?? 0);

  return (
    <Button
      type="button"
      variant="outline"
      className={cn("relative gap-2", className)}
      onClick={onClick}
      aria-label={`Waitlist${matchedCount ? `, ${matchedCount} with openings` : ""}`}
    >
      <ClipboardList className="size-4" />
      <span className="hidden sm:inline">Waitlist</span>
      {totalCount > 0 ? (
        <Badge
          variant={matchedCount > 0 ? "default" : "secondary"}
          className={cn(
            "ml-0.5 h-5 min-w-5 rounded-full px-1.5 text-[10px]",
            matchedCount > 0 && "bg-emerald-600 hover:bg-emerald-600",
          )}
        >
          {matchedCount > 0 ? matchedCount : totalCount}
        </Badge>
      ) : null}
    </Button>
  );
}
