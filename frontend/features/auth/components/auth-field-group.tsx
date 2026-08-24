import { AUTH_FIELD_GROUP_CLASS } from "@/lib/design/auth-tokens";
import { cn } from "@/lib/utils";

export function AuthFieldGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(AUTH_FIELD_GROUP_CLASS, className)}>{children}</div>
  );
}
