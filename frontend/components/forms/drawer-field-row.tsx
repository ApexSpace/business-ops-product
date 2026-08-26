"use client";

import { cn } from "@/lib/utils";

interface DrawerFieldRowProps {
  label?: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

/** MangoMint-style bottom-border field row for drawers. */
export function DrawerFieldRow({
  label,
  children,
  onClick,
  className,
}: DrawerFieldRowProps) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full flex-col gap-drawer-field border-b border-border/70 py-drawer-stack text-left transition-colors",
        onClick && "cursor-pointer hover:bg-muted/30",
        className,
      )}
    >
      {label ? (
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      ) : null}
      <div className="text-[15px] text-foreground">{children}</div>
    </Comp>
  );
}
