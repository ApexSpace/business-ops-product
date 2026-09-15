import { Loader2 } from "lucide-react";
import { AUTH_CARD_CLASS } from "@/lib/design/auth-tokens";
import { cn } from "@/lib/utils";

export function AuthStatus({ message }: { message: string }) {
  return (
    <div
      className={cn(
        AUTH_CARD_CLASS,
        "items-center py-[var(--spacing-6)] text-center",
      )}
    >
      <Loader2
        className="mx-auto size-8 animate-spin text-violet-primary-normal"
        aria-hidden
      />
      <p className="text-body-small text-muted-foreground" role="status">
        {message}
      </p>
    </div>
  );
}
