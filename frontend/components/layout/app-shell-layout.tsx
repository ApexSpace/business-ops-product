"use client";

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
import { BusinessAccessGate } from "@/components/business-access/business-access-gate";
import { ServiceUnavailableBanner } from "@/components/layout/service-unavailable-banner";
import { useOptionalBusinessAccess } from "@/lib/business-access/use-business-access";
import { useShellCurrentBusiness } from "@/lib/hooks/use-shell-current-business";
import { useAuth } from "@/lib/auth/provider";
import { useSnapshotContext } from "@/lib/snapshot/use-snapshot-context";
import { hasPlatformBusinessAdminAccess } from "@/features/auth/permissions/permissions-legacy";
import type { ShellNavItem, ShellNavSection } from "@/lib/types/shell-nav";
import { resolveBusinessNicheProfile } from "@/lib/config/niche";

interface ShellLayoutProps {
  mode: "platform" | "business";
  children: React.ReactNode;
}

export function AppShellLayout({ mode, children }: ShellLayoutProps) {
  const pathname = usePathname();
  const { contexts, jwt, user, sessionError, refreshSession } = useAuth();
  const { context: snapshotContext, t } = useSnapshotContext();
  const businessAccess = useOptionalBusinessAccess();

  const { data: currentBusiness } = useShellCurrentBusiness({
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

  const filterAppsByCapability = (items: ShellNavItem[]): ShellNavItem[] => {
    if (!capabilityKeys) return items;
    return items.filter((item) => {
      if (isCoreSafeBusinessRoute(item.href)) return true;
      return canAccessBusinessRoute(item.href, capabilityKeys);
    });
  };

  const snapshotNavigation =
    mode === "business" && !isSettingsMode
      ? resolveSnapshotNavigation({
          navigation: augmentSnapshotNavigationWithCapabilities(
            snapshotContext.navigation,
            hasModule,
          ),
          resolveLabel: t,
          businessRole: jwt?.businessRole,
          isPlatformAdmin,
          hasModule,
        })
      : null;

  const sections: ShellNavSection[] =
    mode === "platform"
      ? platformOperationalSections
      : isSettingsMode
        ? filterSectionsByCapability(businessSettingsSections)
        : filterSectionsByCapability(snapshotNavigation!.sections);

  const appsItems: ShellNavItem[] =
    mode === "business" && !isSettingsMode && snapshotNavigation
      ? filterAppsByCapability(snapshotNavigation.appsItems)
      : [];

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

  const fullScreenEditor = isFullScreenEditorRoute(pathname);
  const nicheProfile = resolveBusinessNicheProfile({
    business: currentBusiness,
    snapshotContext,
  });

  if (fullScreenEditor) {
    return (
      <>
        {sessionError ? (
          <ServiceUnavailableBanner
            error={sessionError}
            onRetry={() => void refreshSession()}
          />
        ) : null}
        {mode === "business" ? (
          <BusinessAccessGate>
            <div className="flex h-svh min-h-0 flex-col overflow-hidden bg-background">
              {children}
            </div>
          </BusinessAccessGate>
        ) : (
          <div className="flex h-svh min-h-0 flex-col overflow-hidden bg-background">
            {children}
          </div>
        )}
      </>
    );
  }

  const shell = (
    <AppShell
      brand={brand}
      sections={sections}
      appsItems={appsItems}
      navMode={isSettingsMode ? "settings" : "main"}
      footerItems={
        mode === "business" && !isSettingsMode
          ? [businessSettingsEntry]
          : mode === "platform"
            ? [platformSettingsEntry]
            : undefined
      }
      workspaceName={currentBusiness?.name}
      productName="CodeSol"
      shellMode={mode}
      searchPlaceholder={
        mode === "business" ? nicheProfile.shell.searchPlaceholder : undefined
      }
      topbarNotice={mode === "business" ? <BusinessAccessBanner /> : undefined}
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
      {sessionError ? (
        <ServiceUnavailableBanner
          error={sessionError}
          onRetry={() => void refreshSession()}
        />
      ) : null}
      {mode === "business" ? (
        <BusinessAccessGate>{shell}</BusinessAccessGate>
      ) : (
        shell
      )}
    </>
  );
}
