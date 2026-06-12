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
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
