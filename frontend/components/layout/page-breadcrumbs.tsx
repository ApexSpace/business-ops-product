"use client";

import Link from "next/link";
import { Fragment } from "react";
import { ChevronRight } from "lucide-react";
import { useHydrated } from "@/hooks/use-hydrated";
import { usePageMetadata } from "@/lib/page-metadata-context";
import { cn } from "@/lib/utils";
import type { PageBreadcrumb } from "@/config/page-metadata";

interface PageBreadcrumbsProps {
  className?: string;
  /** Override metadata breadcrumbs (e.g. tests). */
  breadcrumbs?: PageBreadcrumb[];
}

export function PageBreadcrumbs({
  className,
  breadcrumbs: breadcrumbsProp,
}: PageBreadcrumbsProps) {
  const hydrated = useHydrated();
  const metadata = usePageMetadata();
  const breadcrumbs = breadcrumbsProp ?? metadata?.breadcrumbs;
  const showBreadcrumbs = breadcrumbs && breadcrumbs.length > 1;

  // Defer until mount so SSR pathname/metadata matches the client (avoids hydration mismatch).
  if (!hydrated || !showBreadcrumbs) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex min-w-0 items-center gap-1 text-sm",
        className,
      )}
    >
      {breadcrumbs.map((crumb, i) => (
        <Fragment key={`${crumb.label}-${i}`}>
          {i > 0 ? (
            <ChevronRight
              className="size-3.5 shrink-0 text-muted-foreground/50"
              aria-hidden
            />
          ) : null}
          {crumb.href && i < breadcrumbs.length - 1 ? (
            <Link
              href={crumb.href}
              className="truncate text-muted-foreground transition-colors duration-150 hover:text-foreground"
            >
              {crumb.label}
            </Link>
          ) : (
            <span
              className={cn(
                "truncate",
                i === breadcrumbs.length - 1
                  ? "font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {crumb.label}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
