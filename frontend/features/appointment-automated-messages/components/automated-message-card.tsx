"use client";

import Link from "next/link";
import { Mail, MessageSquare, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { MoreActionsButton } from "@/components/ui/more-actions-button";
import type { AppointmentAutomatedMessage } from "@/features/appointment-automated-messages/api/appointment-automated-messages.api";
import {
  AUTOMATED_MESSAGE_CARD_CLASS,
  AUTOMATED_MESSAGE_CARD_ROW_CLASS,
} from "@/lib/design/automated-message-tokens";
import { cn } from "@/lib/utils";

function messageLabel(message: AppointmentAutomatedMessage): string {
  const channel = message.channel === "SMS" ? "Text message" : "Email";
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
    <div className={AUTOMATED_MESSAGE_CARD_ROW_CLASS}>
      <div
        className={cn(
          AUTOMATED_MESSAGE_CARD_CLASS,
          !message.enabled && "opacity-60",
        )}
      >
        <Icon
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {messageLabel(message)}
        </p>
        <IconButton
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-muted-foreground"
          aria-label="Edit template"
          disabled={disabled}
          nativeButton={false}
          render={
            <Link
              href={`/business/settings/notifications?tab=templates&type=${encodeURIComponent(message.notificationKey)}`}
            />
          }
        >
          <Settings className="size-4" aria-hidden />
        </IconButton>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <MoreActionsButton
              disabled={disabled}
              aria-label="Message actions"
            />
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onToggleEnabled(!message.enabled)}>
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
