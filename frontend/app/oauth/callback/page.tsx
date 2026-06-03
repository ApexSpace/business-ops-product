"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { formatOAuthErrorMessage } from "@/lib/integrations";
import {
  OAUTH_MESSAGE_TYPE,
  postOAuthResultToOpener,
} from "@/lib/oauth-popup";

function OAuthCallbackContent() {
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<"processing" | "success" | "error">(
    "processing",
  );
  const [message, setMessage] = useState("Connecting account...");

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    const warning = searchParams.get("warning") ?? undefined;
    const providerKey =
      searchParams.get("providerKey") ?? connected ?? undefined;

    if (connected) {
      setPhase("success");
      setMessage("Connection successful. This window will close automatically.");
      postOAuthResultToOpener({
        type: OAUTH_MESSAGE_TYPE.SUCCESS,
        providerKey: providerKey ?? connected,
        warning,
      });
      const timer = window.setTimeout(() => window.close(), 1500);
      return () => window.clearTimeout(timer);
    }

    if (error) {
      const readable = formatOAuthErrorMessage(error);
      setPhase("error");
      setMessage(readable);
      postOAuthResultToOpener({
        type: OAUTH_MESSAGE_TYPE.ERROR,
        providerKey,
        message: readable,
      });
      const timer = window.setTimeout(() => window.close(), 2500);
      return () => window.clearTimeout(timer);
    }

    setPhase("error");
    setMessage("Missing OAuth callback parameters.");
    postOAuthResultToOpener({
      type: OAUTH_MESSAGE_TYPE.ERROR,
      message: "Missing OAuth callback parameters.",
    });
    const timer = window.setTimeout(() => window.close(), 2500);
    return () => window.clearTimeout(timer);
  }, [searchParams]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      {phase === "processing" ? (
        <Loader2 className="mb-4 size-8 animate-spin text-primary" />
      ) : null}
      <h1 className="text-lg font-semibold">
        {phase === "processing"
          ? "Connecting account..."
          : phase === "success"
            ? "Connected"
            : "Connection failed"}
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}
