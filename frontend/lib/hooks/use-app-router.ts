"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useNavigationLoading } from "@/lib/runtime/navigation-loading";

type RouterNavigateOptions = {
  scroll?: boolean;
};

export function useAppRouter() {
  const router = useRouter();
  const { start } = useNavigationLoading();

  const push = useCallback(
    (href: string, options?: RouterNavigateOptions) => {
      start();
      router.push(href, options);
    },
    [router, start],
  );

  const replace = useCallback(
    (href: string, options?: RouterNavigateOptions) => {
      start();
      router.replace(href, options);
    },
    [router, start],
  );

  return { ...router, push, replace };
}
