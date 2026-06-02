"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DataTableColumnHeaderProps {
  title: string;
  sorted?: false | "asc" | "desc";
  onSort?: (event: unknown) => void;
  className?: string;
}

export function DataTableColumnHeader({
  title,
  sorted,
  onSort,
  className,
}: DataTableColumnHeaderProps) {
  if (!onSort) {
    return <span className={cn(className)}>{title}</span>;
  }

  const Icon =
    sorted === "asc"
      ? ArrowUp
      : sorted === "desc"
        ? ArrowDown
        : ArrowUpDown;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn("-ml-2.5 h-7 px-2 text-xs font-medium text-muted-foreground hover:text-foreground", className)}
      onClick={onSort}
    >
      {title}
      <Icon className="ml-1 size-3.5" />
    </Button>
  );
}
