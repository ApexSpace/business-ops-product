"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ApiClientError } from "@/lib/api/errors";

export default function ContactsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[contacts]", error);
  }, [error]);

  const requestId =
    error instanceof ApiClientError ? error.requestId : undefined;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-lg font-semibold">Could not load contacts</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred."}
      </p>
      {requestId ? (
        <p className="text-xs text-muted-foreground">Request ID: {requestId}</p>
      ) : null}
      <Button type="button" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
