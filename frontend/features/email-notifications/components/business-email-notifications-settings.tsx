"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { PageTabs, PageTabsPanel } from "@/components/layout/page-tabs";
import { EmailLogsTab } from "@/features/email-notifications/components/email-logs-tab";
import { EmailNotificationsTab } from "@/features/email-notifications/components/email-notifications-tab";
import { Skeleton } from "@/components/ui/skeleton";

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

export function BusinessEmailNotificationsSettings() {
  const [tab, setTab] = useState("notifications");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Control which notifications send and whether they go by email or SMS. Customize email templates and review delivery logs."
      />

      <PageTabs
        value={tab}
        onValueChange={setTab}
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
          <EmailLogsTab />
        </PageTabsPanel>
      </PageTabs>
    </div>
  );
}
