"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { Building2, Settings } from "lucide-react";
import { AppShell } from "@/components/shell";
import {
  businessSettingsEntry,
  resolveBusinessOperationalSections,
} from "@/lib/config/navigation/business-menu";
import {
  businessSettingsSections,
  isBusinessSettingsPath,
} from "@/lib/config/navigation/business-settings-menu";
import {
  platformBrand,
  platformOperationalSections,
  platformSettingsEntry,
} from "@/lib/config/navigation/platform-menu";
import { ServiceUnavailableBanner } from "@/components/layout/service-unavailable-banner";
import { shouldShowAccountSwitcher } from "@/lib/auth";
import { getCurrentBusiness } from "@/features/settings/api/business.api";
import { queryKeys } from "@/lib/query/keys";
import { useAuth } from "@/lib/auth/provider";
import { getIndustryLabels } from "@/lib/config/industry-labels";
import type { Business } from "@/lib/types/shared";
import type { ShellNavSection } from "@/lib/types/shell-nav";

interface ShellLayoutProps {
  mode: "platform" | "business";
  children: React.ReactNode;
}

export function AppShellLayout({ mode, children }: ShellLayoutProps) {
  const pathname = usePathname();
  const { contexts, jwt, user, sessionError, refreshSession } = useAuth();

  const { data: currentBusiness } = useQuery({
    queryKey: queryKeys.business.current(),
    queryFn: getCurrentBusiness,
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

  const showAccountSwitcher = shouldShowAccountSwitcher(
    contexts,
    jwt,
    user?.contexts,
  );

  return (
    <>
      {sessionError ? (
        <ServiceUnavailableBanner
          error={sessionError}
          onRetry={() => void refreshSession()}
        />
      ) : null}
      <AppShell
      brand={brand}
      sections={sections}
      navMode={isSettingsMode ? "settings" : "main"}
      footerItems={footerItems}
      showAccountSwitcher={showAccountSwitcher}
      pageMetadataContext={{
        mode,
        labels,
        settingsMode: isSettingsMode,
      }}
    >
      {children}
    </AppShell>
    </>
  );
}
