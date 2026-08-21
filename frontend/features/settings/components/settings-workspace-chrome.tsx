"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PageBreadcrumbs } from "@/components/layout/page-breadcrumbs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { isNavItemActive } from "@/components/shell/sidebar-nav-utils";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { cn } from "@/lib/utils";
import type { ShellNavItem, ShellNavSection } from "@/lib/types/shell-nav";

function useFilteredSettingsSections(): ShellNavSection[] {
  const { contexts, jwt } = useAuth();
  const businessAccess = useOptionalBusinessAccess();
  const isPlatformAdmin = hasPlatformBusinessAdminAccess(jwt, contexts);
  const capabilityKeys = businessAccess?.capabilityKeys;

  return useMemo(() => {
    const roleFiltered = filterBusinessSettingsSections({
      sections: businessSettingsSections,
      businessRole: jwt?.businessRole,
      staffPermissions: jwt?.staffPermissions,
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

function flattenSettingsItems(sections: ShellNavSection[]): ShellNavItem[] {
  return sections.flatMap((section) => section.items);
}

function SettingsNavLink({ item }: { item: ShellNavItem }) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const active = hydrated && isNavItemActive(pathname, item);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-w-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-white font-medium text-foreground shadow-sm ring-1 ring-border/60"
          : "text-muted-foreground hover:bg-white/70 hover:text-foreground",
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0",
          active ? "text-primary" : "text-muted-foreground",
        )}
        aria-hidden
      />
      <span className="min-w-0 break-words leading-snug">{item.title}</span>
    </Link>
  );
}

function SettingsDesktopNav({ sections }: { sections: ShellNavSection[] }) {
  return (
    <nav
      aria-label="Settings"
      className="hidden w-56 shrink-0 lg:block xl:w-60"
    >
      <ScrollArea className="h-full max-h-[calc(100svh-var(--shell-navbar-height)-3rem)] pr-2">
        <div className="space-y-5 pb-4">
          {sections.map((section) => (
            <div key={section.id} className="space-y-1">
              {section.label ? (
                <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                  {section.label}
                </p>
              ) : null}
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <SettingsNavLink item={item} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </ScrollArea>
    </nav>
  );
}

function SettingsMobileNav({ sections }: { sections: ShellNavSection[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useHydrated();
  const items = useMemo(() => flattenSettingsItems(sections), [sections]);

  const activeItem = hydrated
    ? items.find((item) => isNavItemActive(pathname, item))
    : undefined;

  return (
    <div className="lg:hidden">
      <Select
        value={activeItem?.href}
        onValueChange={(href) => {
          if (href) router.push(href);
        }}
      >
        <SelectTrigger
          className="h-10 w-full bg-white"
          aria-label="Settings section"
        >
          <SelectValue placeholder="Choose a settings page" />
        </SelectTrigger>
        <SelectContent align="start" className="max-h-80">
          {sections.map((section) => (
            <SelectGroup key={section.id}>
              {section.label ? (
                <SelectLabel>{section.label}</SelectLabel>
              ) : null}
              {section.items.map((item) => (
                <SelectItem key={item.href} value={item.href}>
                  {item.title}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SettingsPageHeading() {
  const metadata = usePageMetadata();

  if (!metadata?.title) {
    return null;
  }

  return (
    <div className="min-w-0 space-y-1">
      <PageBreadcrumbs />
      <h1 className="text-page-title font-bold tracking-tight text-foreground">
        {metadata.title}
      </h1>
      {metadata.description ? (
        <p className="text-caption max-w-2xl text-muted-foreground">
          {metadata.description}
        </p>
      ) : null}
    </div>
  );
}

export function SettingsWorkspaceChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const sections = useFilteredSettingsSections();

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-5">
      <SettingsPageHeading />
      <SettingsMobileNav sections={sections} />
      <div className="flex min-h-0 min-w-0 flex-1 gap-6 lg:gap-8">
        <SettingsDesktopNav sections={sections} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
