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
        description="Control transactional emails, customize templates, and review delivery logs."
      />

      <PageTabs
        value={tab}
        onValueChange={setTab}
        tabs={[
          { value: "notifications", label: "Email Notifications" },
          { value: "templates", label: "Templates" },
          { value: "logs", label: "Logs" },
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
