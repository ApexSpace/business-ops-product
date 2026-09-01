"use client";

import { cn } from "@/lib/utils";
import { usePageMetadata } from "@/lib/runtime/page-metadata-context";
import {
  SETTINGS_CONTENT_SHELL_CLASS,
  SETTINGS_FORM_DESCRIPTION_CLASS,
  SETTINGS_FORM_SECTION_HEADER_CLASS,
  SETTINGS_PAGE_LAYOUT_CLASS,
} from "@/lib/design/settings-form-tokens";

export function SettingsPageLayout({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(SETTINGS_PAGE_LAYOUT_CLASS, className)}>{children}</div>
  );
}

export function SettingsContentShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(SETTINGS_CONTENT_SHELL_CLASS, className)}>{children}</div>
  );
}

export interface SettingsFormSectionProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

/** Shared title + muted description for settings forms. Falls back to page metadata. */
export function SettingsFormSection({
  title,
  description,
  children,
  className,
}: SettingsFormSectionProps) {
  const metadata = usePageMetadata();
  const resolvedTitle = title ?? metadata?.title;
  const resolvedDescription = description ?? metadata?.description;

  if (!resolvedTitle && !children) return null;

  return (
    <div className={cn(SETTINGS_FORM_SECTION_HEADER_CLASS, className)}>
      {resolvedTitle ? (
        <h1 className="text-page-title">{resolvedTitle}</h1>
      ) : null}
      {resolvedDescription ? (
        <p className={SETTINGS_FORM_DESCRIPTION_CLASS}>{resolvedDescription}</p>
      ) : null}
      {children}
    </div>
  );
}

/** Settings form page — shell + metadata header + body. */
export function SettingsFormPage({
  children,
  title,
  description,
  className,
  shellClassName,
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  shellClassName?: string;
}) {
  return (
    <SettingsPageLayout className={className}>
      <SettingsContentShell className={shellClassName}>
        <SettingsFormSection title={title} description={description} />
        {children}
      </SettingsContentShell>
    </SettingsPageLayout>
  );
}
