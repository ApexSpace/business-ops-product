"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { PageTabs, PageTabsPanel } from "@/components/layout/page-tabs";
import { EmailNotificationsTab } from "@/features/email-notifications/components/email-notifications-tab";
import { listEmailLogs } from "@/features/email-notifications/api/email-notifications.api";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/lib/query/keys";

const EmailTemplatesTab = dynamic(
  () =>
    import("@/features/email-notifications/components/email-templates-tab").then(
      (m) => m.EmailTemplatesTab,
    ),
  {
    loading: () => <Skeleton className="min-h-[16rem] w-full" />,
    ssr: false,
  },
);

const EmailLogsTab = dynamic(
  () =>
    import("@/features/email-notifications/components/email-logs-tab").then(
      (m) => m.EmailLogsTab,
    ),
  {
    loading: () => <Skeleton className="min-h-[16rem] w-full" />,
    ssr: false,
  },
);

const DEFAULT_LOGS_FILTERS = {
  search: "",
  emailType: "",
  status: "",
  dateFrom: "",
  dateTo: "",
  page: 1,
  limit: 25,
} as const;

export function BusinessEmailNotificationsSettings() {
  const [tab, setTab] = useState("notifications");
  const queryClient = useQueryClient();

  const prefetchLogs = () => {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.emailNotifications.logs({ ...DEFAULT_LOGS_FILTERS }),
      queryFn: () =>
        listEmailLogs({
          page: DEFAULT_LOGS_FILTERS.page,
          limit: DEFAULT_LOGS_FILTERS.limit,
        }),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Control which notifications send and whether they go by email or SMS. Customize email templates and review delivery logs."
      />

      <PageTabs
        value={tab}
        onValueChange={setTab}
        onTabHover={(value) => {
          if (value === "logs") prefetchLogs();
        }}
        tabs={[
          { value: "notifications", label: "Notifications" },
          { value: "templates", label: "Email Templates" },
          { value: "logs", label: "Email Logs" },
        ]}
      >
        <PageTabsPanel value="notifications">
          <EmailNotificationsTab />
        </PageTabsPanel>
        <PageTabsPanel value="templates">
          {tab === "templates" ? <EmailTemplatesTab /> : null}
        </PageTabsPanel>
        <PageTabsPanel value="logs">
          {tab === "logs" ? <EmailLogsTab /> : null}
        </PageTabsPanel>
      </PageTabs>
    </div>
  );
}
