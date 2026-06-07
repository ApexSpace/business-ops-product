"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { toast } from "sonner";
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
  updateEmailPreferences,
  type EmailPreference,
  type EmailTypeCategory,
} from "@/features/email-notifications/api/email-notifications.api";
import { queryKeys } from "@/lib/query/keys";

const CATEGORY_ORDER: EmailTypeCategory[] = [
  "membership",
  "appointments",
  "invoices",
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

function NotificationToggleRow({
  item,
  disabled,
  onToggle,
}: {
  item: EmailPreference;
  disabled: boolean;
  onToggle: (item: EmailPreference, enabled: boolean) => void;
}) {
  const locked = item.systemOnly || item.businessConfigurable === false;

  return (
    <div className="flex items-start justify-between gap-4 p-4">
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
      <Switch
        id={item.emailType}
        checked={item.enabled}
        disabled={locked || disabled}
        onCheckedChange={(checked) => onToggle(item, checked)}
      />
    </div>
  );
}

export function EmailNotificationsTab() {
  const queryClient = useQueryClient();
  const [expandedCategories, setExpandedCategories] = useState<
    EmailTypeCategory[]
  >([]);

  const { data = [], isLoading } = useQuery({
    queryKey: queryKeys.emailNotifications.preferences(),
    queryFn: listEmailPreferences,
  });

  const mutation = useMutation({
    mutationFn: (preferences: { emailType: string; enabled: boolean }[]) =>
      updateEmailPreferences(preferences),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.emailNotifications.all(),
      });
      toast.success("Notification preferences updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
    mutation.mutate([{ emailType: item.emailType, enabled }]);
  };

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Loading preferences…</p>
    );
  }

  if (allItems.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No email notification types are available yet.
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
                    disabled={mutation.isPending}
                    onToggle={toggle}
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
