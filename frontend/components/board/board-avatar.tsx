"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getBoardInitials } from "@/components/board/board-utils";
import { cn } from "@/lib/utils";

export interface BoardAvatarProps {
  name: string;
  className?: string;
}

export function BoardAvatar({ name, className }: BoardAvatarProps) {
  return (
    <Avatar size="sm" className={cn("shrink-0", className)}>
      <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
        {getBoardInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
