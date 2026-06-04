"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUserErrorMessage } from "@/lib/api/user-error-message";

type ApiErrorStateProps = {
  error: unknown;
  title?: string;
  onRetry?: () => void;
  compact?: boolean;
  className?: string;
};

export function ApiErrorState({
  error,
  title,
  onRetry,
  compact = false,
  className,
}: ApiErrorStateProps) {
  const message = getUserErrorMessage(error);

  return (
    <div
      className={
        className ??
        (compact
          ? "flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3"
          : "flex min-h-[12rem] flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center")
      }
      role="alert"
    >
      <div className="flex items-start gap-2 text-left">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {title ?? message.title}
          </p>
          {message.description ? (
            <p className="text-sm text-muted-foreground">{message.description}</p>
          ) : null}
          {message.requestId ? (
            <p className="text-xs text-muted-foreground">
              Reference: {message.requestId}
            </p>
          ) : null}
        </div>
      </div>
      {onRetry ? (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
