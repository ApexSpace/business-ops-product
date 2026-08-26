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
      className={cn(
        "w-full",
        fullHeight
          ? dense
            ? "flex flex-col gap-2"
            : "flex flex-col gap-[var(--page-stack-gap)]"
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
