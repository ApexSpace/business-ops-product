"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  emailCategoryDescription,
  emailCategoryLabel,
  listEmailPreferences,
  type EmailPreference,
  type EmailTypeCategory,
} from "@/features/email-notifications/api/email-notifications.api";
import { useEmailNotificationPreferenceMutations } from "@/features/email-notifications/hooks/use-email-notification-preference-mutations";
import {
  listNotificationChannelPreferences,
  type NotificationChannel,
  type NotificationChannelPreference,
} from "@/features/notifications/api/notification-channel-preferences.api";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/query/keys";

const CATEGORY_ORDER: EmailTypeCategory[] = [
  "membership",
  "appointments",
  "invoices",
  "gift_cards",
  "packages",
  "auth",
];

const SYSTEM_AUTH_TYPES: EmailPreference[] = [
  {
    emailType: "auth.password_reset",
    category: "auth",
    label: "Password reset",
    description: "Sent when a user requests a password reset link.",
    enabled: true,
    isCustomized: false,
    systemOnly: true,
    businessConfigurable: false,
  },
  {
    emailType: "auth.password_changed",
    category: "auth",
    label: "Password changed",
    description:
      "Sent after a password reset succeeds to confirm the account change.",
    enabled: true,
    isCustomized: false,
    systemOnly: true,
    businessConfigurable: false,
  },
  {
    emailType: "auth.email_verification",
    category: "auth",
    label: "Email verification",
    description: "Sent to verify a new account email address.",
    enabled: true,
    isCustomized: false,
    systemOnly: true,
    businessConfigurable: false,
  },
];

function CompactChannelControl({
  notificationKey,
  value,
  disabled,
  onChange,
}: {
  notificationKey: string;
  value: NotificationChannel;
  disabled: boolean;
  onChange: (channel: NotificationChannel) => void;
}) {
  return (
    <div
      className={cn(
        "inline-flex rounded-md border border-border/70 p-0.5",
        disabled && "opacity-60",
      )}
      role="group"
      aria-label={`Delivery channel for ${notificationKey}`}
    >
      {(["EMAIL", "SMS"] as const).map((channel) => (
        <button
          key={channel}
          type="button"
          disabled={disabled}
          onClick={() => onChange(channel)}
          className={cn(
            "rounded px-2.5 py-1 text-xs font-medium transition-colors",
            value === channel
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground",
            disabled && "cursor-not-allowed",
          )}
        >
          {channel === "EMAIL" ? "Email" : "SMS"}
        </button>
      ))}
    </div>
  );
}

function NotificationToggleRow({
  item,
  channel,
  onToggle,
  onChannelChange,
}: {
  item: EmailPreference;
  channel: NotificationChannel;
  onToggle: (item: EmailPreference, enabled: boolean) => void;
  onChannelChange: (
    item: EmailPreference,
    channel: NotificationChannel,
  ) => void;
}) {
  const locked = item.systemOnly || item.businessConfigurable === false;
  const showChannel = !locked;

  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor={item.emailType} className="font-medium">
            {item.label}
          </Label>
          {locked ? (
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <Lock className="size-3" />
              System
            </Badge>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">{item.description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {showChannel ? (
          <CompactChannelControl
            notificationKey={item.emailType}
            value={channel}
            disabled={locked || !item.enabled}
            onChange={(next) => onChannelChange(item, next)}
          />
        ) : null}
        <Switch
          id={item.emailType}
          checked={item.enabled}
          disabled={locked}
          onCheckedChange={(checked) => onToggle(item, checked)}
        />
      </div>
    </div>
  );
}

export function EmailNotificationsTab() {
  const [expandedCategories, setExpandedCategories] = useState<
    EmailTypeCategory[]
  >([]);
  const { preferencesMutation, channelMutation } =
    useEmailNotificationPreferenceMutations();

  const { data = [], isLoading } = useQuery({
    queryKey: queryKeys.emailNotifications.preferences(),
    queryFn: listEmailPreferences,
  });

  const { data: channelPrefs = [] } = useQuery({
    queryKey: queryKeys.notificationChannelPreferences.all(),
    queryFn: listNotificationChannelPreferences,
  });

  const channelByKey = useMemo(() => {
    const map = new Map<string, NotificationChannelPreference>();
    for (const pref of channelPrefs) {
      map.set(pref.notificationKey, pref);
    }
    return map;
  }, [channelPrefs]);

  const allItems = useMemo(() => [...data, ...SYSTEM_AUTH_TYPES], [data]);

  const itemsByCategory = useMemo(() => {
    const grouped = new Map<EmailTypeCategory, EmailPreference[]>();

    for (const category of CATEGORY_ORDER) {
      const items = allItems.filter((item) => item.category === category);
      if (items.length > 0) {
        grouped.set(category, items);
      }
    }

    return grouped;
  }, [allItems]);

  const toggle = (item: EmailPreference, enabled: boolean) => {
    if (item.systemOnly || item.businessConfigurable === false) {
      return;
    }
    preferencesMutation.mutate([{ emailType: item.emailType, enabled }]);
  };

  const changeChannel = (
    item: EmailPreference,
    channel: NotificationChannel,
  ) => {
    if (item.systemOnly || item.businessConfigurable === false) {
      return;
    }
    channelMutation.mutate({
      notificationKey: item.emailType,
      channel,
    });
  };

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Loading preferences…</p>
    );
  }

  if (allItems.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No notification types are available yet.
      </p>
    );
  }

  const visibleCategories = CATEGORY_ORDER.filter((category) =>
    itemsByCategory.has(category),
  );

  return (
    <Accordion
      multiple
      value={expandedCategories}
      onValueChange={(value) =>
        setExpandedCategories(value as EmailTypeCategory[])
      }
      className="rounded-lg border px-4"
    >
      {visibleCategories.map((category) => {
        const categoryItems = itemsByCategory.get(category) ?? [];
        const enabledCount = categoryItems.filter(
          (item) => item.enabled,
        ).length;

        return (
          <AccordionItem key={category} value={category}>
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex flex-1 flex-col items-start gap-0.5 pr-2 text-left sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium">
                  {emailCategoryLabel(category)}
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  {enabledCount} of {categoryItems.length} enabled
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <p className="mb-3 text-sm text-muted-foreground">
                {emailCategoryDescription(category)}
              </p>
              <div className="divide-y rounded-lg border">
                {categoryItems.map((item) => (
                  <NotificationToggleRow
                    key={item.emailType}
                    item={item}
                    channel={
                      channelByKey.get(item.emailType)?.channel ?? "EMAIL"
                    }
                    onToggle={toggle}
                    onChannelChange={changeChannel}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
