import { cn } from "@/lib/utils";

export function RequiredIndicator({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("text-destructive", className)}
      title="Required"
    >
      *
    </span>
  );
}
