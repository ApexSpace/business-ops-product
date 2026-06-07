"use client";

import { DataToolbar } from "@/components/layout/data-toolbar";
import { usePageMetadata } from "@/lib/runtime/page-metadata-context";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title?: React.ReactNode;
  description?: string;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  /** When false, hide the in-page h1 (e.g. nested sections). Defaults to true. */
  showTitle?: boolean;
  className?: string;
}

function PageHeaderHeading({
  title,
  displayTitle,
}: {
  title?: React.ReactNode;
  displayTitle: boolean;
}) {
  if (!displayTitle || !title) {
    return null;
  }

  return typeof title === "string" ? (
    <h1 className="text-page-title">{title}</h1>
  ) : (
    title
  );
}

function PageHeaderDescription({ description }: { description?: string }) {
  if (!description) {
    return null;
  }

  return <p className="text-caption max-w-2xl">{description}</p>;
}

function PageHeaderTitleBlock({
  title,
  description,
  displayTitle,
}: {
  title?: React.ReactNode;
  description?: string;
  displayTitle: boolean;
}) {
  const hasHeading = displayTitle && Boolean(title);
  const hasDescription = Boolean(description);

  if (!hasHeading && !hasDescription) {
    return null;
  }

  return (
    <div className="min-w-0 space-y-1">
      {hasHeading ? (
        <PageHeaderHeading title={title} displayTitle={displayTitle} />
      ) : null}
      {hasDescription ? (
        <PageHeaderDescription description={description} />
      ) : null}
    </div>
  );
}

function PageHeaderActions({ actions }: { actions: React.ReactNode }) {
  return (
    <div className="flex shrink-0 flex-nowrap items-center justify-end gap-2 sm:ml-auto">
      {actions}
    </div>
  );
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
  const hasHeading = displayTitle && Boolean(title);
  const hasDescription = Boolean(description);

  if (!hasHeading && !hasDescription && !filters && !actions) {
    return null;
  }

  // Without filters, title and actions share one row; description sits below.
  if (!filters && actions) {
    return (
      <div className={cn("space-y-1", className)}>
        <div className="flex flex-col gap-2 pb-0.5 sm:flex-row sm:flex-nowrap sm:items-center sm:justify-between sm:gap-3">
          {hasHeading ? (
            <div className="min-w-0 flex-1">
              <PageHeaderHeading title={title} displayTitle={displayTitle} />
            </div>
          ) : null}
          <PageHeaderActions actions={actions} />
        </div>
        <PageHeaderDescription description={description} />
      </div>
    );
  }

  return (
    <div className={cn("space-y-[var(--page-stack-gap)]", className)}>
      <PageHeaderTitleBlock
        title={title}
        description={description}
        displayTitle={displayTitle}
      />
      {filters || actions ? (
        <DataToolbar filters={filters} actions={actions} />
      ) : null}
    </div>
  );
}
