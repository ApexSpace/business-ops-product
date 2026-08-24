import { AUTH_CALLOUT_CLASS } from "@/lib/design/auth-tokens";
import { cn } from "@/lib/utils";

const TONE_CLASS = {
  warning: "border-warning/30 bg-warning-subtle text-warning",
  error: "border-destructive/30 bg-destructive-subtle text-destructive",
  success: "border-success/30 bg-success-subtle text-success",
} as const;

export function AuthCallout({
  tone,
  children,
  className,
}: {
  tone: keyof typeof TONE_CLASS;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(AUTH_CALLOUT_CLASS, TONE_CLASS[tone], className)}
    >
      {children}
    </p>
  );
}
