import { Skeleton } from "@/components/ui/skeleton";
import {
  AUTH_CARD_CLASS,
  AUTH_FIELD_GROUP_CLASS,
  AUTH_FORM_STACK_CLASS,
} from "@/lib/design/auth-tokens";
import { cn } from "@/lib/utils";

export function AuthPanel({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(AUTH_CARD_CLASS, className)}>
      {title ? (
        <header className="text-center">
          <h1 className="text-heading-5">{title}</h1>
          {description ? (
            <p className="mt-[var(--spacing-2)] text-body-small text-muted-foreground">
              {description}
            </p>
          ) : null}
        </header>
      ) : null}
      {children}
    </div>
  );
}

export function AuthPanelSkeleton() {
  return (
    <div className={AUTH_CARD_CLASS} aria-busy aria-label="Loading">
      <div className={cn(AUTH_FORM_STACK_CLASS)}>
        <div className={AUTH_FIELD_GROUP_CLASS}>
          <Skeleton className="h-[var(--control-height)] w-full rounded-none" />
          <Skeleton className="h-[var(--control-height)] w-full rounded-none" />
        </div>
        <Skeleton className="h-[var(--control-height)] w-full" />
      </div>
    </div>
  );
}
