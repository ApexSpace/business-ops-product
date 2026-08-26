/**
 * Shell full-bleed / chrome path helpers.
 * Owned by shell layout — not by any single feature.
 */

import { isBusinessSettingsPath } from "@/lib/config/navigation/business-settings-menu";

/** Legacy per-contact workspace route (`/business/contacts/[id]`). */
export function isContactWorkspacePath(pathname: string): boolean {
  return /^\/business\/contacts\/[^/]+$/.test(pathname);
}

/** Conversations inbox — same full-bleed shell treatment as contact workspace. */
export function isConversationsInboxPath(pathname: string): boolean {
  return (
    pathname === "/business/conversations" ||
    pathname === "/platform/conversations"
  );
}

/** Appointments calendar — full-bleed white canvas. */
export function isAppointmentsCalendarPath(pathname: string): boolean {
  return (
    pathname === "/business/appointments" ||
    pathname.startsWith("/business/appointments/")
  );
}

/** Sales workspace — full-bleed mobile list. */
export function isSalesWorkspacePath(pathname: string): boolean {
  return pathname === "/business/sales" || pathname.startsWith("/business/sales/");
}

/** Payments workspace — pathname only (overview + all tabs). */
export function isPaymentsWorkspacePath(pathname: string): boolean {
  return (
    pathname === "/business/payments" ||
    pathname.startsWith("/business/payments/")
  );
}

const PAYMENTS_MOBILE_LIST_TABS = new Set([
  "estimates",
  "invoices",
  "transactions",
  "received",
]);

/**
 * Payments mobile full-bleed — only tabs that render MobileEntityListScreen.
 * Overview (missing/`overview` tab) keeps normal shell padding.
 */
export function isPaymentsMobileListPath(
  pathname: string,
  search: string,
): boolean {
  if (!isPaymentsWorkspacePath(pathname)) return false;
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const tab = params.get("tab");
  return tab !== null && PAYMENTS_MOBILE_LIST_TABS.has(tab);
}

/** Contacts list — full-bleed mobile list (`/business/contacts`). */
export function isContactsListPath(pathname: string): boolean {
  return pathname === "/business/contacts";
}

const MOBILE_ENTITY_LIST_PATHS = new Set([
  "/business/gift-cards",
  "/business/packages",
  "/business/memberships",
  "/business/products",
  "/business/offers",
  "/business/leads",
  "/business/tasks",
  "/business/time-cards",
]);

/** Major entity list workspaces that use MobileEntityListScreen on mobile. */
export function isMobileEntityListPath(pathname: string): boolean {
  return MOBILE_ENTITY_LIST_PATHS.has(pathname);
}

/** Business Settings two-pane workspace — full-bleed below the top navbar. */
export function isBusinessSettingsWorkspacePath(pathname: string): boolean {
  return isBusinessSettingsPath(pathname);
}

function matchesPathPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Apps catalog routes that are master-detail / canvas workspaces (not DataTable).
 * DataTable Apps (Forms, Automations, Pipeline settings, Sales, …) stay padded.
 *
 * Add a prefix here when a new non-table Apps page should inherit full-bleed.
 * Do not add per-page layout patches.
 */
export const APPS_MASTER_DETAIL_WORKSPACE_PREFIXES = [
  "/business/settings/services",
  "/business/settings/resources",
  "/business/settings/team",
] as const;

/** Services, Resources, Team, and nested routes under those Apps. */
export function isAppsMasterDetailWorkspacePath(pathname: string): boolean {
  return APPS_MASTER_DETAIL_WORKSPACE_PREFIXES.some((prefix) =>
    matchesPathPrefix(pathname, prefix),
  );
}

/** Reports two-pane workspace — same full-bleed as Settings. */
export function isReportsWorkspacePath(pathname: string): boolean {
  return (
    pathname === "/business/reports" ||
    pathname.startsWith("/business/reports/")
  );
}
