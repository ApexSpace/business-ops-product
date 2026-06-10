"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { IconButton } from "@/components/ui/icon-button";

const COPIED_RESET_MS = 2000;

function truncateSubscriptionId(id: string): string {
  if (id.length <= 8) return id;
  return `${id.slice(0, 8)}…`;
}

export function SubscriptionIdCell({
  subscriptionId,
}: {
  subscriptionId?: string | null;
}) {
  const [copied, setCopied] = useState(false);

  if (!subscriptionId) {
    return <span className="text-muted-foreground">—</span>;
  }

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(subscriptionId);
      setCopied(true);
      toast.success("Subscription ID copied");
      setTimeout(() => setCopied(false), COPIED_RESET_MS);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  return (
    <div className="flex items-center gap-0.5">
      <span className="font-mono text-xs" title={subscriptionId}>
        {truncateSubscriptionId(subscriptionId)}
      </span>
      <IconButton
        aria-label={copied ? "Copied" : "Copy subscription ID"}
        className="size-7 shrink-0"
        onClick={() => void copyId()}
      >
        {copied ? (
          <Check className="size-3.5 text-emerald-600" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </IconButton>
    </div>
  );
}
