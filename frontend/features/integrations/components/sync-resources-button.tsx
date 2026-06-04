"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SyncResourcesButtonProps {
  onSync: () => void;
  isPending?: boolean;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export function SyncResourcesButton({
  onSync,
  isPending = false,
  disabled = false,
  label = "Sync resources",
  className,
}: SyncResourcesButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled || isPending}
      onClick={onSync}
      className={cn(className)}
    >
      <RefreshCw className={cn("size-4", isPending && "animate-spin")} />
      <span>{label}</span>
    </Button>
  );
}
