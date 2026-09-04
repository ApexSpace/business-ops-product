"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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

type SettingsFormHeaderContextValue = {
  /** Resolved page title shown by SettingsFormSection. */
  pageTitle: string | null;
  setHeaderAction: (node: ReactNode | null) => void;
};

const SettingsFormHeaderContext =
  createContext<SettingsFormHeaderContextValue | null>(null);

/**
 * Lets a primary SettingsInlineEditSection attach its edit control to the
 * page header when its title matches the page title (avoids double headings).
 */
export function useSettingsFormHeader() {
  return useContext(SettingsFormHeaderContext);
}

export interface SettingsFormSectionProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  /** Optional trailing action (e.g. edit) — usually provided via context. */
  action?: ReactNode;
}

/** Shared title + muted description for settings forms. Falls back to page metadata. */
export function SettingsFormSection({
  title,
  description,
  children,
  className,
  action,
}: SettingsFormSectionProps) {
  const metadata = usePageMetadata();
  const resolvedTitle = title ?? metadata?.title;
  const resolvedDescription = description ?? metadata?.description;

  if (!resolvedTitle && !children && !action) return null;

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-[var(--spacing-4)]",
        className,
      )}
    >
      <div className={cn(SETTINGS_FORM_SECTION_HEADER_CLASS, "min-w-0 flex-1")}>
        {resolvedTitle ? (
          <h1 className="text-page-title">{resolvedTitle}</h1>
        ) : null}
        {resolvedDescription ? (
          <p className={SETTINGS_FORM_DESCRIPTION_CLASS}>
            {resolvedDescription}
          </p>
        ) : null}
        {children}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
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
  const metadata = usePageMetadata();
  const pageTitle = title ?? metadata?.title ?? null;
  const [headerAction, setHeaderActionState] = useState<ReactNode | null>(null);

  const setHeaderAction = useCallback((node: ReactNode | null) => {
    setHeaderActionState(node);
  }, []);

  const headerContext = useMemo(
    () => ({ pageTitle, setHeaderAction }),
    [pageTitle, setHeaderAction],
  );

  return (
    <SettingsFormHeaderContext.Provider value={headerContext}>
      <SettingsPageLayout className={className}>
        <SettingsContentShell className={shellClassName}>
          <SettingsFormSection
            title={title}
            description={description}
            action={headerAction}
          />
          {children}
        </SettingsContentShell>
      </SettingsPageLayout>
    </SettingsFormHeaderContext.Provider>
  );
}
