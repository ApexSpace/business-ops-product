"use client";

import { DataToolbar } from "@/components/layout/data-toolbar";
import { usePageMetadata } from "@/lib/runtime/page-metadata-context";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title?: string;
  description?: string;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  /** When false, hide the in-page h1 (e.g. nested sections). Defaults to true. */
  showTitle?: boolean;
  className?: string;
}

export function PageHeader({
  title: titleProp,
  description: descriptionProp,
  filters,
  actions,
  showTitle = true,
  className,
}: PageHeaderProps) {
  const metadata = usePageMetadata();
  const title = titleProp ?? metadata?.title;
  const description = descriptionProp ?? metadata?.description;
  const displayTitle = showTitle && Boolean(title);

  if (!displayTitle && !description && !filters && !actions) {
    return null;
  }

  return (
    <div className={cn("space-y-[var(--page-stack-gap)]", className)}>
      {displayTitle || description ? (
        <div className="min-w-0 space-y-1">
          {displayTitle && title ? (
            <h1 className="text-page-title">{title}</h1>
          ) : null}
          {description ? (
            <p className="text-caption max-w-2xl">{description}</p>
          ) : null}
        </div>
      ) : null}
      {filters || actions ? (
        <DataToolbar filters={filters} actions={actions} />
      ) : null}
    </div>
  );
}
