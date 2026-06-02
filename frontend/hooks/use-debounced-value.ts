"use client";

import { useEffect, useState } from "react";

const DEFAULT_DEBOUNCE_MS = 300;

/**
 * Returns a debounced copy of `value` after `delayMs` of no changes.
 */
export function useDebouncedValue<T>(value: T, delayMs = DEFAULT_DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
