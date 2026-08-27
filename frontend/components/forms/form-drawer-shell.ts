/**
 * Shared FormSheet chrome recipes — default Figma drawer language.
 *
 * Ownership: visual values live in globals.css / theme; recipes come from
 * `lib/design/drawer-tokens`. This file is a FormSheet contract, not a second
 * visual system. Features must not introduce new raw color / radius / height.
 */

import {
  DRAWER_CLOSE_ACTION_CLASS,
  DRAWER_DESCRIPTION_CLASS,
  DRAWER_FIELD_CONTROL_CLASS,
  DRAWER_FIELD_LABEL_SHELL_CLASS,
  DRAWER_FORM_DIVIDER_CLASS,
  DRAWER_FORM_ITEM_CLASS,
  DRAWER_HEADER_CLASS,
  DRAWER_SHELL_CONTENT_INSET_CLASS,
  DRAWER_SHELL_WIDTH_COMPACT,
  DRAWER_SHELL_WIDTH_STANDARD,
  DRAWER_SHELL_WIDTH_WIDE,
  DRAWER_TITLE_CLASS,
} from "@/lib/design/drawer-tokens";
import { DRAWER_SHEET_FOOTER_WIDE_CLASS } from "@/components/forms/drawer-sheet";

/** Sheet close control — same hover chip as drawer header edit/trash. */
export const FORM_DRAWER_CLOSE_CLASS = [
  "[&_[data-slot=sheet-close]]:relative",
  "[&_[data-slot=sheet-close]]:static",
  "[&_[data-slot=sheet-close]]:self-center",
  "[&_[data-slot=sheet-close]]:!size-[var(--drawer-header-icon-size)]",
  "[&_[data-slot=sheet-close]]:!min-h-[var(--drawer-header-icon-size)]",
  "[&_[data-slot=sheet-close]]:!min-w-[var(--drawer-header-icon-size)]",
  "[&_[data-slot=sheet-close]]:rounded-md",
  "[&_[data-slot=sheet-close]]:!border-0",
  "[&_[data-slot=sheet-close]]:bg-transparent",
  "[&_[data-slot=sheet-close]]:p-0",
  "[&_[data-slot=sheet-close]]:text-muted-foreground",
  "[&_[data-slot=sheet-close]]:!shadow-none",
  "[&_[data-slot=sheet-close]]:hover:bg-violet-primary-normal/10",
  "[&_[data-slot=sheet-close]]:hover:text-violet-primary-normal",
  "[&_[data-slot=sheet-close]]:[&>svg]:size-4",
].join(" ");

export type FormDrawerShellWidth = "compact" | "standard" | "wide";

export function formDrawerSheetClass(
  width: FormDrawerShellWidth = "standard",
): string {
  const widthClass =
    width === "wide"
      ? DRAWER_SHELL_WIDTH_WIDE
      : width === "compact"
        ? DRAWER_SHELL_WIDTH_COMPACT
        : DRAWER_SHELL_WIDTH_STANDARD;
  return `${widthClass} shadow-elevation-lg ${FORM_DRAWER_CLOSE_CLASS}`;
}

export const FORM_DRAWER_SHEET_CLASS = formDrawerSheetClass("standard");

/** Full-height financial sheet (pinned right edge). Width comes from `formDrawerSheetClass`. */
export const FORM_DRAWER_SHEET_FINANCIAL_CLASS = `!top-0 !right-0 !bottom-0 !left-auto !h-full !max-h-none !w-full !max-w-[var(--sheet-width)] !translate-x-0 !translate-y-0 rounded-none border-l shadow-elevation-lg ${FORM_DRAWER_CLOSE_CLASS}`;

/** Figma white header — title and close share one row. */
export const FORM_DRAWER_HEADER_CLASS = DRAWER_HEADER_CLASS;

/** Wider horizontal padding for financial forms. */
export const FORM_DRAWER_HEADER_COMPACT_CLASS =
  "relative flex shrink-0 flex-col justify-center border-x-0 border-t-0 border-b border-solid border-[var(--drawer-header-border)] !bg-white px-7 py-drawer-header-y [background-image:none]";

export const FORM_DRAWER_TITLE_CLASS = DRAWER_TITLE_CLASS;

export const FORM_DRAWER_TITLE_COMPACT_CLASS =
  "text-xl font-semibold tracking-tight text-violet-primary-darker";

export const FORM_DRAWER_DESCRIPTION_CLASS = DRAWER_DESCRIPTION_CLASS;

export const FORM_DRAWER_CONTENT_CLASS = DRAWER_SHELL_CONTENT_INSET_CLASS;

export const FORM_DRAWER_CONTENT_COMPACT_CLASS =
  "space-y-drawer-stack px-7 pt-drawer-body-y pb-drawer-body-bottom scrollbar-thin";

export const FORM_DRAWER_FOOTER_CLASS = DRAWER_SHEET_FOOTER_WIDE_CLASS;

export const FORM_DRAWER_FIELD_CONTROL_CLASS = DRAWER_FIELD_CONTROL_CLASS;

export const FORM_DRAWER_FIELD_LABEL_CLASS = DRAWER_FIELD_LABEL_SHELL_CLASS;

export const FORM_DRAWER_FORM_ITEM_CLASS = DRAWER_FORM_ITEM_CLASS;

export const FORM_DRAWER_FORM_DIVIDER_CLASS = DRAWER_FORM_DIVIDER_CLASS;

/** Flex column body for contact profile (scroll managed by children). */
export const FORM_DRAWER_BODY_FLEX_CLASS =
  "flex min-h-0 flex-1 flex-col space-y-0 overflow-hidden !px-6 !pt-[var(--drawer-body-padding-y)] !pb-[var(--drawer-body-padding-bottom)]";

/** @internal Kept for IconButton sizing references in DrawerShell. */
export const FORM_DRAWER_CLOSE_ICON_CLASS = DRAWER_CLOSE_ACTION_CLASS;
