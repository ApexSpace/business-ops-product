"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { PageTabs, PageTabsPanel } from "@/components/layout/page-tabs";
import { WhatsAppFlowsTab } from "@/features/whatsapp-settings/components/whatsapp-flows-tab";
import { WhatsAppNumbersTab } from "@/features/whatsapp-settings/components/whatsapp-numbers-tab";
import { WhatsAppTemplatesTab } from "@/features/whatsapp-settings/components/whatsapp-templates-tab";
import {
  parseWhatsAppSettingsTab,
  WHATSAPP_SETTINGS_TABS,
  type WhatsAppSettingsTab,
} from "@/features/whatsapp-settings/schemas/whatsapp-settings-tabs";

export function BusinessWhatsAppSettings() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTab = parseWhatsAppSettingsTab(searchParams.get("tab"));

  const setActiveTab = useCallback(
    (tab: WhatsAppSettingsTab) => {
      const next = new URLSearchParams(searchParams.toString());
      if (tab === "numbers") next.delete("tab");
      else next.set("tab", tab);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return (
    <div className="w-full min-w-0 space-y-6">
      <PageHeader />

      <PageTabs
        value={activeTab}
        onValueChange={(value) =>
          setActiveTab(parseWhatsAppSettingsTab(value))
        }
        tabs={[...WHATSAPP_SETTINGS_TABS]}
        className="w-full"
      >
        <PageTabsPanel value="numbers">
          <WhatsAppNumbersTab />
        </PageTabsPanel>
        <PageTabsPanel value="templates">
          <WhatsAppTemplatesTab />
        </PageTabsPanel>
        <PageTabsPanel value="flows">
          <WhatsAppFlowsTab />
        </PageTabsPanel>
      </PageTabs>
    </div>
  );
}
