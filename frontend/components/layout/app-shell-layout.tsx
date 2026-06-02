"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { Building2, Settings } from "lucide-react";
import { AppShell } from "@/components/shell";
import { AccountSwitcher } from "@/components/account-switcher/account-switcher";
import {
  businessSettingsEntry,
  resolveBusinessOperationalSections,
} from "@/config/business-menu";
import {
  businessSettingsSections,
  isBusinessSettingsPath,
} from "@/config/business-settings-menu";
import {
  platformBrand,
  platformOperationalSections,
  platformSettingsEntry,
} from "@/config/platform-menu";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/lib/auth-provider";
import { getIndustryLabels } from "@/config/industry-labels";
import type { Business } from "@/types/api";
import type { ShellNavSection } from "@/types/shell-nav";

interface ShellLayoutProps {
  mode: "platform" | "business";
  children: React.ReactNode;
}

export function AppShellLayout({ mode, children }: ShellLayoutProps) {
  const pathname = usePathname();
  const { contexts } = useAuth();

  const { data: currentBusiness } = useQuery({
    queryKey: queryKeys.business.current(),
    queryFn: () => apiClient<Business>("businesses/current"),
    enabled: mode === "business",
  });

  const labels = getIndustryLabels(currentBusiness?.industry);
  const isSettingsMode =
    mode === "business" && isBusinessSettingsPath(pathname);

  const sections: ShellNavSection[] =
    mode === "platform"
      ? platformOperationalSections
      : isSettingsMode
        ? businessSettingsSections
        : resolveBusinessOperationalSections(labels);

  const footerItems =
    mode === "business" && !isSettingsMode
      ? [businessSettingsEntry]
      : mode === "platform"
        ? [platformSettingsEntry]
        : undefined;

  const brand =
    mode === "platform"
      ? platformBrand
      : isSettingsMode
        ? {
            title: currentBusiness?.name ?? "Business",
            subtitle: "Settings",
            icon: Settings,
          }
        : {
            title: currentBusiness?.name ?? "Business",
            subtitle: currentBusiness?.industry?.name ?? "",
            icon: Building2,
          };

  const showAccountSwitcher = contexts.length > 0;

  return (
    <AppShell
      brand={brand}
      sections={sections}
      navMode={isSettingsMode ? "settings" : "main"}
      footerItems={footerItems}
      showAccountSwitcher={showAccountSwitcher}
      topbarActions={
        showAccountSwitcher ? (
          <div className="sm:hidden">
            <AccountSwitcher />
          </div>
        ) : undefined
      }
      pageMetadataContext={{
        mode,
        labels,
        settingsMode: isSettingsMode,
      }}
    >
      {children}
    </AppShell>
  );
}
