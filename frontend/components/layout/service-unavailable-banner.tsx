"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUserErrorMessage } from "@/lib/api/user-error-message";

type ServiceUnavailableBannerProps = {
  error: unknown;
  onRetry?: () => void;
};

export function ServiceUnavailableBanner({
  error,
  onRetry,
}: ServiceUnavailableBannerProps) {
  const message = getUserErrorMessage(error);

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm"
      role="alert"
    >
      <div className="flex min-w-0 items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0">
          <p className="font-medium text-foreground">{message.title}</p>
          {message.description ? (
            <p className="text-muted-foreground">{message.description}</p>
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
          Retry
        </Button>
      ) : null}
    </div>
  );
}
