"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface SettingRowProps {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}

export function SettingRow({ label, htmlFor, children, className }: SettingRowProps) {
  return (
    <div className={cn("space-y-[var(--spacing-2)]", className)}>
      <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
