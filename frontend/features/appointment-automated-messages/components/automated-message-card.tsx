"use client";

import Link from "next/link";
import { Mail, MessageSquare, MoreVertical, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AppointmentAutomatedMessage } from "@/features/appointment-automated-messages/api/appointment-automated-messages.api";
import { cn } from "@/lib/utils";

function messageLabel(message: AppointmentAutomatedMessage): string {
  const channel =
    message.channel === "SMS" ? "Text message" : "Email";
  if (message.notificationKey === "appointment.reminder") {
    return `${channel} reminder to client`;
  }
  if (message.notificationKey === "appointment.confirmation") {
    return `${channel} confirmation to client`;
  }
  return `${channel}: ${message.notificationKey}`;
}

export function AutomatedMessageCard({
  message,
  disabled,
  onToggleEnabled,
  onDelete,
}: {
  message: AppointmentAutomatedMessage;
  disabled?: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  onDelete: () => void;
}) {
  const Icon = message.channel === "SMS" ? MessageSquare : Mail;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[10px] border border-[#E8E4DC] bg-white px-3 py-2.5",
        !message.enabled && "opacity-60",
      )}
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
        {messageLabel(message)}
      </p>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 shrink-0"
        aria-label="Edit template"
        disabled={disabled}
        nativeButton={false}
        render={
          <Link
            href={`/business/settings/notifications?tab=templates&type=${encodeURIComponent(message.notificationKey)}`}
          />
        }
      >
        <Settings2 className="size-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              disabled={disabled}
              aria-label="Message actions"
            >
              <MoreVertical className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => onToggleEnabled(!message.enabled)}
          >
            {message.enabled ? "Disable" : "Enable"}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive"
            onClick={onDelete}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
