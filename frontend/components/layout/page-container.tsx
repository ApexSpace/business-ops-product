import { cn } from "@/lib/utils";

export interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  /** Tighter vertical rhythm for dense operational pages */
  dense?: boolean;
  /** Flex fill-height: use gap instead of space-y so children can grow. */
  fullHeight?: boolean;
}

export function PageContainer({
  children,
  className,
  dense = false,
  fullHeight = false,
}: PageContainerProps) {
  return (
    <div
      {...(fullHeight ? { "data-workspace-fill": "" } : {})}
      className={cn(
        "w-full",
        fullHeight
          ? dense
            ? "flex h-0 min-h-0 flex-1 flex-col gap-2 overflow-hidden"
            : "flex h-0 min-h-0 flex-1 flex-col gap-[var(--page-stack-gap)] overflow-hidden"
          : dense
            ? "space-y-2"
            : "space-y-[var(--page-stack-gap)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
