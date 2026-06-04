"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Opens a create dialog when `?action=create` is present, then clears the param. */
export function usePaymentsTabCreateAction(onOpen: () => void) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (searchParams.get("action") !== "create") {
      handled.current = false;
      return;
    }
    if (handled.current) {
      return;
    }
    handled.current = true;
    onOpen();

    const next = new URLSearchParams(searchParams.toString());
    next.delete("action");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, pathname, router, onOpen]);
}
