"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { captureApiError } from "@/lib/observability/sentry";
import { getUserErrorMessage } from "@/lib/api/user-error-message";

type SegmentErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
};

export function SegmentError({ error, reset, title = "Something went wrong" }: SegmentErrorProps) {
  useEffect(() => {
    captureApiError(error, {
      code:
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof (error as { code: unknown }).code === "string"
          ? (error as { code: string }).code
          : undefined,
      requestId: getUserErrorMessage(error).requestId,
    });
  }, [error]);

  const message = getUserErrorMessage(error);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-md text-sm font-medium text-foreground">{message.title}</p>
      {message.description ? (
        <p className="max-w-md text-sm text-muted-foreground">{message.description}</p>
      ) : null}
      {message.requestId ? (
        <p className="text-xs text-muted-foreground">Reference: {message.requestId}</p>
      ) : null}
      <Button type="button" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
