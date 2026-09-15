import { Check, CheckCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MessageStatus } from "@/features/conversations/api/conversations.api";

type MessageDeliveryStatusProps = {
  status: MessageStatus;
  className?: string;
  showLabel?: boolean;
  tone?: "default" | "onBrand";
};

const STATUS_LABEL: Partial<Record<MessageStatus, string>> = {
  PENDING: "Sending",
  SENT: "Sent",
  DELIVERED: "Delivered",
  READ: "Read",
};

export function MessageDeliveryStatus({
  status,
  className,
  showLabel = false,
  tone = "default",
}: MessageDeliveryStatusProps) {
  const label = STATUS_LABEL[status];
  if (!label) return null;

  const onBrand = tone === "onBrand";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1",
        onBrand ? "text-white/80" : "text-muted-foreground",
        className,
      )}
      title={label}
      aria-label={label}
    >
      {status === "PENDING" ? (
        <Clock className="size-3 opacity-70" aria-hidden />
      ) : status === "SENT" ? (
        <Check className="size-3 opacity-80" aria-hidden />
      ) : (
        <CheckCheck
          className={cn("size-3.5 opacity-90", status === "READ" && !onBrand && "text-violet-primary-normal")}
          aria-hidden
        />
      )}
      {showLabel ? <span className="text-[11px]">{label}</span> : null}
    </span>
  );
}
