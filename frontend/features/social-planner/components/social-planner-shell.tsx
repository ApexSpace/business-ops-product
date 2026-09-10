"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { cn } from "@/lib/utils";
import {
  SOCIAL_PLANNER_TAB_ACTIVE_CLASS,
  SOCIAL_PLANNER_TAB_BASE_CLASS,
  SOCIAL_PLANNER_TAB_IDLE_CLASS,
  SOCIAL_PLANNER_TAB_LIST_CLASS,
} from "@/features/social-planner/styles/social-planner-tokens";

const TABS = [
  { href: "/business/social-planner", label: "Planner", match: "exact" as const },
  {
    href: "/business/social-planner/posts",
    label: "Posts",
    match: "prefix" as const,
  },
  {
    href: "/business/social-planner/comments",
    label: "Comments",
    match: "prefix" as const,
  },
] as const;

function isTabActive(
  pathname: string,
  tab: (typeof TABS)[number],
): boolean {
  if (tab.match === "exact") {
    return pathname === tab.href || pathname === `${tab.href}/`;
  }
  return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
}

export type SocialPlannerNavProps = {
  actions?: React.ReactNode;
  className?: string;
};

/** Figma-styled Planner / Posts / Comments tabs (+ optional right actions). */
export function SocialPlannerNav({ actions, className }: SocialPlannerNavProps) {
  const pathname = usePathname() ?? "";

  return (
    <div
      className={cn(
        "flex flex-col gap-[var(--spacing-4)] sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <nav aria-label="Social Planner" className={SOCIAL_PLANNER_TAB_LIST_CLASS}>
        {TABS.map((tab) => {
          const active = isTabActive(pathname, tab);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                SOCIAL_PLANNER_TAB_BASE_CLASS,
                active
                  ? SOCIAL_PLANNER_TAB_ACTIVE_CLASS
                  : SOCIAL_PLANNER_TAB_IDLE_CLASS,
              )}
              aria-current={active ? "page" : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export type SocialPlannerShellProps = {
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

/**
 * Shared chrome for Social Planner pages that are not EntityListLayout.
 */
export function SocialPlannerShell({
  children,
  actions,
  className,
  contentClassName,
}: SocialPlannerShellProps) {
  return (
    <PageContainer className={className}>
      <SocialPlannerNav actions={actions} />
      <div className={cn("min-w-0", contentClassName)}>{children}</div>
    </PageContainer>
  );
}
