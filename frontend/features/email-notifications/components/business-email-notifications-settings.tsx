"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { PageTabs, PageTabsPanel } from "@/components/layout/page-tabs";
import { EmailLogsTab } from "@/features/email-notifications/components/email-logs-tab";
import { EmailNotificationsTab } from "@/features/email-notifications/components/email-notifications-tab";
import { EmailTemplatesTab } from "@/features/email-notifications/components/email-templates-tab";

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
          <EmailTemplatesTab />
        </PageTabsPanel>
        <PageTabsPanel value="logs">
          <EmailLogsTab />
        </PageTabsPanel>
      </PageTabs>
    </div>
  );
}
