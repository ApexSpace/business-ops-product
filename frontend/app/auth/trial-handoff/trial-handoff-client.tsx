"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthStatus } from "@/features/auth/components/auth-status";
import { useAuth } from "@/lib/auth/provider";
import { useAppRouter } from "@/lib/hooks/use-app-router";
import {
  needsContextSelection,
  resolvePostLoginPath,
} from "@/lib/runtime/routing";
import type { AuthTokensResponse } from "@/lib/types/shared";

export function TrialHandoffClient() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code") ?? "";
  const router = useAppRouter();
  const { refreshSession } = useAuth();
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    if (!code) {
      router.replace("/login?reason=trial-handoff-expired");
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/trial-handoff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ code }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof json.message === "string"
              ? json.message
              : "Handoff expired",
          );
        }
        const tokens = json.data as AuthTokensResponse;
        await refreshSession();
        if (cancelled) return;
        if (needsContextSelection(tokens.contexts)) {
          router.replace("/select-context");
        } else {
          router.replace(resolvePostLoginPath(tokens));
        }
        router.refresh();
      } catch {
        if (!cancelled) {
          setMessage("Redirecting to sign in…");
          router.replace("/login?reason=trial-handoff-expired");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, refreshSession, router]);

  return <AuthStatus message={message} />;
}
