"use client";

import { useCallback, useRef, useState } from "react";

function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useSubmitWithIdempotency() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const keyRef = useRef<string | null>(null);

  const run = useCallback(
    async <T>(fn: (idempotencyKey: string) => Promise<T>): Promise<T | undefined> => {
      if (isSubmitting) return undefined;
      setIsSubmitting(true);
      if (!keyRef.current) {
        keyRef.current = createIdempotencyKey();
      }
      try {
        return await fn(keyRef.current);
      } finally {
        setIsSubmitting(false);
        keyRef.current = null;
      }
    },
    [isSubmitting],
  );

  return { isSubmitting, run };
}
