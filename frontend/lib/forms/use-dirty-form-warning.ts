"use client";

import { useEffect } from "react";

export function useDirtyFormWarning(isDirty: boolean, message?: string) {
  const warning =
    message ?? "You have unsaved changes. Leave this page anyway?";

  useEffect(() => {
    if (!isDirty) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = warning;
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty, warning]);
}
