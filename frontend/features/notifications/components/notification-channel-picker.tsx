"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { NotificationChannel } from "@/features/notifications/api/notification-channel-preferences.api";
import { cn } from "@/lib/utils";

const CHANNEL_OPTIONS: {
  value: NotificationChannel;
  label: string;
  description: string;
}[] = [
  {
    value: "EMAIL",
    label: "Email",
    description: "Send the notification by email",
  },
  {
    value: "SMS",
    label: "SMS",
    description: "Send the notification by text message",
  },
];

export interface NotificationChannelPickerProps {
  notificationKey: string;
  value: NotificationChannel;
  onChange: (channel: NotificationChannel) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

/**
 * Shared EMAIL/SMS picker for a notification key.
 * Reusable on Express Booking settings and a future Notifications tab.
 */
export function NotificationChannelPicker({
  notificationKey: _notificationKey,
  value,
  onChange,
  disabled = false,
  className,
  label = "Send via",
}: NotificationChannelPickerProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      <RadioGroup
        value={value}
        disabled={disabled}
        onValueChange={(next) => {
          if (next === "EMAIL" || next === "SMS") {
            onChange(next);
          }
        }}
        className="gap-3"
      >
        {CHANNEL_OPTIONS.map((option) => {
          const id = `notification-channel-${option.value.toLowerCase()}`;
          return (
            <label
              key={option.value}
              htmlFor={id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-md border border-border/70 p-3",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <RadioGroupItem id={id} value={option.value} className="mt-0.5" />
              <span className="space-y-0.5">
                <span className="block text-sm font-medium text-foreground">
                  {option.label}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {option.description}
                </span>
              </span>
            </label>
          );
        })}
      </RadioGroup>
    </div>
  );
}
