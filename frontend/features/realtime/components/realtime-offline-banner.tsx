"use client";

import { WifiOff } from "lucide-react";
import { useRealtimeConnectionState } from "@/features/realtime/realtime-mode-context";
import { isAnyRealtimeTransportEnabled } from "@/features/realtime/realtime-polling";

export function RealtimeOfflineBanner() {
  const connectionState = useRealtimeConnectionState();

  if (!isAnyRealtimeTransportEnabled() || connectionState !== "degraded") {
    return null;
  }

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 border-b border-amber-500/25 bg-amber-500/10 px-4 py-1.5 text-xs text-amber-900 dark:text-amber-100"
    >
      <WifiOff className="size-3.5 shrink-0 opacity-80" aria-hidden />
      <span>Realtime offline — polling for updates…</span>
    </div>
  );
}
