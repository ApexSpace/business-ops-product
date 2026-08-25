"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Menu } from "lucide-react";
import { SettingsLayout } from "@/components/layout/settings-layout";
import { PageBreadcrumbs } from "@/components/layout/page-breadcrumbs";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetTitle,
} from "@/components/ui/sheet";
import { DRAWER_SHELL_WIDTH_COMPACT } from "@/lib/design/drawer-tokens";
import {
  businessSettingsSections,
  filterBusinessSettingsSections,
} from "@/lib/config/navigation/business-settings-menu";
import { useAuth } from "@/lib/auth/provider";
import { hasPlatformBusinessAdminAccess } from "@/features/auth/permissions/permissions-legacy";
import { useOptionalBusinessAccess } from "@/lib/business-access/use-business-access";
import {
  canAccessBusinessRoute,
  isCoreSafeBusinessRoute,
} from "@/lib/capabilities/route-capability-map";
import { usePageMetadata } from "@/lib/runtime/page-metadata-context";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { SettingsNavPanel } from "@/features/settings/components/settings-nav-panel";
import type { ShellNavSection } from "@/lib/types/shell-nav";

const LG_QUERY = "(min-width: 1024px)";

function isSettingsIndexPath(pathname: string): boolean {
  return pathname === "/business/settings" || pathname === "/business/settings/";
}

function useFilteredSettingsSections(): ShellNavSection[] {
  const { contexts, jwt } = useAuth();
  const businessAccess = useOptionalBusinessAccess();
  const isPlatformAdmin = hasPlatformBusinessAdminAccess(jwt, contexts);
  const capabilityKeys = businessAccess?.capabilityKeys;

  return useMemo(() => {
    const roleFiltered = filterBusinessSettingsSections({
      sections: businessSettingsSections,
      businessRole: jwt?.businessRole,
      staffPermissions: jwt?.staffPermissions ?? undefined,
      isPlatformAdmin,
    });

    if (!capabilityKeys) return roleFiltered;

    return roleFiltered
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (isCoreSafeBusinessRoute(item.href)) return true;
          return canAccessBusinessRoute(item.href, capabilityKeys);
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [
    jwt?.businessRole,
    jwt?.staffPermissions,
    isPlatformAdmin,
    capabilityKeys,
  ]);
}

function useIsLg(): boolean {
  const hydrated = useHydrated();
  const [isLg, setIsLg] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(LG_QUERY);
    const onChange = () => setIsLg(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return hydrated && isLg;
}

function SettingsContentHeader() {
  const metadata = usePageMetadata();

  if (!metadata?.title) return null;

  return (
    <div className="min-w-0 space-y-1">
      <PageBreadcrumbs />
      <h1 className="text-lg font-semibold tracking-tight text-foreground">
        {metadata.title}
      </h1>
      {metadata.description ? (
        <p className="text-sm text-muted-foreground">{metadata.description}</p>
      ) : null}
    </div>
  );
}

export function SettingsWorkspaceChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const sections = useFilteredSettingsSections();
  const isLg = useIsLg();
  const browseMode = isSettingsIndexPath(pathname) && !isLg;
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  const nav = (
    <SettingsNavPanel
      sections={sections}
      onNavigate={() => setNavOpen(false)}
    />
  );

  const toolbar = browseMode ? (
    <h1 className="px-1 text-lg font-semibold text-foreground">Settings</h1>
  ) : (
    <div className="flex items-center gap-2 lg:hidden">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/business/settings" />}
      >
        <ArrowLeft className="size-4" />
        Settings
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="ml-auto hidden md:inline-flex lg:hidden"
        onClick={() => setNavOpen(true)}
      >
        <Menu className="size-4" />
        Browse
      </Button>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      <SettingsLayout
        browseMode={browseMode}
        sidebar={nav}
        toolbar={isLg ? undefined : toolbar}
      >
        <div className="flex min-h-0 min-w-0 flex-col gap-6 p-4 lg:p-6">
          <SettingsContentHeader />
          {children}
        </div>
      </SettingsLayout>

      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent
          side="left"
          className={DRAWER_SHELL_WIDTH_COMPACT}
          showCloseButton
        >
          <SheetHeader>
            <SheetTitle>Settings</SheetTitle>
          </SheetHeader>
          <SheetBody className="p-0">{nav}</SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}
