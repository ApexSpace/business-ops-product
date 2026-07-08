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
import { isFullScreenEditorRoute } from "@/lib/config/navigation/full-screen-editor-routes";
import {
  platformBrand,
  platformOperationalSections,
  platformSettingsEntry,
} from "@/lib/config/navigation/platform-menu";
import { augmentSnapshotNavigationWithCapabilities } from "@/lib/capabilities/augment-snapshot-navigation";
import { resolveSnapshotNavigation } from "@/lib/config/snapshot/resolve-snapshot-navigation";
import {
  canAccessBusinessRoute,
  isCoreSafeBusinessRoute,
} from "@/lib/capabilities/route-capability-map";
import { BusinessAccessBanner } from "@/components/business-access/business-access-banner";
import { isBusinessAccessError } from "@/lib/api/error-classifier";
import { ServiceUnavailableBanner } from "@/components/layout/service-unavailable-banner";
import { useOptionalBusinessAccess } from "@/lib/business-access/use-business-access";
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
  const businessAccess = useOptionalBusinessAccess();
  const isBillingRecovery = Boolean(
    mode === "business" && businessAccess?.isBillingRecovery,
  );

  const { data: currentBusiness } = useQuery({
    queryKey: queryKeys.business.current(),
    queryFn: getCurrentBusiness,
    enabled: mode === "business",
  });

  const isSettingsMode =
    mode === "business" && isBusinessSettingsPath(pathname);

  const isPlatformAdmin = hasPlatformBusinessAdminAccess(jwt, contexts);

  const hasModule =
    mode === "business" && businessAccess
      ? businessAccess.hasModule
      : undefined;
  const capabilityKeys =
    mode === "business" && businessAccess
      ? businessAccess.capabilityKeys
      : undefined;

  const filterSectionsByCapability = (
    sections: ShellNavSection[],
  ): ShellNavSection[] => {
    if (!capabilityKeys) return sections;
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (isCoreSafeBusinessRoute(item.href)) return true;
          return canAccessBusinessRoute(item.href, capabilityKeys);
        }),
      }))
      .filter((section) => section.items.length > 0);
  };

  const sections: ShellNavSection[] = isBillingRecovery
    ? []
    : mode === "platform"
      ? platformOperationalSections
      : isSettingsMode
        ? filterSectionsByCapability(businessSettingsSections)
        : resolveSnapshotNavigation({
            navigation: augmentSnapshotNavigationWithCapabilities(
              snapshotContext.navigation,
              hasModule,
            ),
            resolveLabel: t,
            businessRole: jwt?.businessRole,
            isPlatformAdmin,
            hasModule,
          });

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
            subtitle: "",
            icon: Building2,
          };

  const showAccountSwitcher = shouldShowAccountSwitcher(
    contexts,
    jwt,
    user?.contexts,
  );

  const fullScreenEditor = isFullScreenEditorRoute(pathname);

  const showSessionUnavailableBanner =
    sessionError != null && !isBusinessAccessError(sessionError);

  const sessionErrorBanner = showSessionUnavailableBanner ? (
    <ServiceUnavailableBanner
      error={sessionError}
      onRetry={() => void refreshSession()}
      placement={mode === "business" ? "inline" : "fixed-top"}
    />
  ) : null;

  if (fullScreenEditor) {
    return (
      <>
        {mode !== "business" ? sessionErrorBanner : null}
        <div className="flex h-svh min-h-0 flex-col overflow-hidden bg-background">
          {mode === "business" && sessionErrorBanner ? (
            <div className="shrink-0 px-4 pt-4">{sessionErrorBanner}</div>
          ) : null}
          {children}
        </div>
      </>
    );
  }

  const shell = (
    <AppShell
      brand={brand}
      sections={sections}
      navMode={isSettingsMode ? "settings" : "main"}
      footerItems={
        isBillingRecovery
          ? undefined
          : mode === "business" && !isSettingsMode
            ? [businessSettingsEntry]
            : mode === "platform"
              ? [platformSettingsEntry]
              : undefined
      }
      hideSidebar={isBillingRecovery}
      showAccountSwitcher={showAccountSwitcher}
      topbarNotice={mode === "business" ? <BusinessAccessBanner /> : undefined}
      contentNotice={mode === "business" ? sessionErrorBanner : undefined}
      pageMetadataContext={{
        mode,
        terminology: snapshotContext.terminology,
        settingsMode: isSettingsMode,
      }}
    >
      {children}
    </AppShell>
  );

  return (
    <>
      {mode !== "business" ? sessionErrorBanner : null}
      {shell}
    </>
  );
}
