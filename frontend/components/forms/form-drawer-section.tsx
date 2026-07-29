"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function FormDrawerSection({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border/70 bg-card/60 p-4 shadow-[0_1px_2px_rgba(18,23,43,0.04)]",
        className,
      )}
    >
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden />
        </div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
