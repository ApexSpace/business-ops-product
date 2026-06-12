import { Check, CheckCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MessageStatus } from "@/features/conversations/api/conversations.api";

type MessageDeliveryStatusProps = {
  status: MessageStatus;
  className?: string;
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
}: MessageDeliveryStatusProps) {
  const label = STATUS_LABEL[status];
  if (!label) return null;

  return (
    <span
      className={cn("inline-flex items-center", className)}
      title={label}
      aria-label={label}
    >
      {status === "PENDING" ? (
        <Clock className="size-3 opacity-70" aria-hidden />
      ) : status === "SENT" ? (
        <Check className="size-3 opacity-80" aria-hidden />
      ) : (
        <CheckCheck
          className={cn(
            "size-3.5 opacity-90",
            status === "READ" && "text-sky-300",
          )}
          aria-hidden
        />
      )}
    </span>
  );
}
