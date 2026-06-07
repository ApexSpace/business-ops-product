"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FormOptionalSectionProps {
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export function FormOptionalSection({
  label,
  open,
  onOpenChange,
  children,
  className,
}: FormOptionalSectionProps) {
  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground",
          className,
        )}
        onClick={() => onOpenChange(true)}
      >
        <Plus className="size-3.5" />
        {label}
      </Button>
    );
  }

  return (
    <div className={cn("space-y-3 rounded-lg border border-dashed p-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-muted-foreground"
          onClick={() => onOpenChange(false)}
        >
          <X className="size-3.5" />
          Hide
        </Button>
      </div>
      {children}
    </div>
  );
}
