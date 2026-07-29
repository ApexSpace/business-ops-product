import { cn } from "@/lib/utils";

export interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  /** Tighter vertical rhythm for dense operational pages */
  dense?: boolean;
}

export function PageContainer({
  children,
  className,
  dense = false,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "w-full",
        dense ? "space-y-2" : "space-y-[var(--page-stack-gap)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
