"use client";

import { PageBreadcrumbs } from "@/components/layout/page-breadcrumbs";
import { usePageMetadata } from "@/lib/runtime/page-metadata-context";
import { cn } from "@/lib/utils";

interface TopbarPageHeadingProps {
  className?: string;
  /** Tighter title on small screens */
  compact?: boolean;
}

export function TopbarPageHeading({
  className,
  compact = false,
}: TopbarPageHeadingProps) {
  const metadata = usePageMetadata();

  if (!metadata?.title) {
    return null;
  }

  return (
    <div className={cn("min-w-0", className)}>
      <PageBreadcrumbs className="mb-1" />
      <h1
        className={cn(
          "truncate font-bold tracking-tight text-foreground",
          compact ? "text-lg" : "text-xl sm:text-2xl",
        )}
      >
        {metadata.title}
      </h1>
      {metadata.description ? (
        <p
          className={cn(
            "mt-0.5 truncate text-muted-foreground",
            compact ? "text-xs" : "text-[13px]",
          )}
        >
          {metadata.description}
        </p>
      ) : null}
    </div>
  );
}
