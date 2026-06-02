import { cn } from "@/lib/utils";

export interface ActionBarProps {
  children: React.ReactNode;
  className?: string;
  align?: "start" | "end" | "between";
  sticky?: boolean;
}

export function ActionBar({
  children,
  className,
  align = "end",
  sticky = false,
}: ActionBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        align === "end" && "justify-end",
        align === "start" && "justify-start",
        align === "between" && "justify-between",
        sticky &&
          "sticky bottom-0 z-10 -mx-1 border-t border-border/80 bg-background/90 px-1 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/75",
        className,
      )}
    >
      {children}
    </div>
  );
}
