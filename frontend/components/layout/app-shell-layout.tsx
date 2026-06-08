"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { Building2, Settings } from "lucide-react";
import { AppShell } from "@/components/shell";
import { businessSettingsEntry } from "@/lib/config/navigation/business-menu";
import {
  businessSettingsSections,
  isBusinessSettingsPath,
} from "@/lib/config/navigation/business-settings-menu";
import {
  platformBrand,
  platformOperationalSections,
  platformSettingsEntry,
} from "@/lib/config/navigation/platform-menu";
import { resolveSnapshotNavigation } from "@/lib/config/snapshot/resolve-snapshot-navigation";
import { ServiceUnavailableBanner } from "@/components/layout/service-unavailable-banner";
import { shouldShowAccountSwitcher } from "@/lib/auth";
import { getCurrentBusiness } from "@/features/settings/api/business.api";
import { queryKeys } from "@/lib/query/keys";
import { useAuth } from "@/lib/auth/provider";
import { useSnapshotContext } from "@/lib/snapshot/use-snapshot-context";
import { hasPlatformBusinessAdminAccess } from "@/features/auth/permissions/permissions-legacy";
import type { ShellNavSection } from "@/lib/types/shell-nav";

interface ShellLayoutProps {
  mode: "platform" | "business";
  children: React.ReactNode;
}

export function AppShellLayout({ mode, children }: ShellLayoutProps) {
  const pathname = usePathname();
  const { contexts, jwt, user, sessionError, refreshSession } = useAuth();
  const { context: snapshotContext, t } = useSnapshotContext();

  const { data: currentBusiness } = useQuery({
    queryKey: queryKeys.business.current(),
    queryFn: getCurrentBusiness,
    enabled: mode === "business",
  });

  const isSettingsMode =
    mode === "business" && isBusinessSettingsPath(pathname);

  const isPlatformAdmin = hasPlatformBusinessAdminAccess(jwt, contexts);

  const sections: ShellNavSection[] =
    mode === "platform"
      ? platformOperationalSections
      : isSettingsMode
        ? businessSettingsSections
        : resolveSnapshotNavigation({
            navigation: snapshotContext.navigation,
            resolveLabel: t,
            businessRole: jwt?.businessRole,
            isPlatformAdmin,
          });

  const footerItems =
    mode === "business" && !isSettingsMode
      ? [businessSettingsEntry]
      : mode === "platform"
        ? [platformSettingsEntry]
        : undefined;

  const brandSubtitle =
    snapshotContext.branding.productName ??
    snapshotContext.snapshotName ??
    "";

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
            subtitle: brandSubtitle,
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
          terminology: snapshotContext.terminology,
          settingsMode: isSettingsMode,
        }}
      >
        {children}
      </AppShell>
    </>
  );
}
