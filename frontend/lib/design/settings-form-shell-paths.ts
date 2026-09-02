/** Settings routes whose screens render title/description inside SettingsContentShell. */
const SETTINGS_FORM_SHELL_PATH_PREFIXES = [
  "/business/settings/profile",
  "/business/settings/financial",
  "/business/settings/custom-fees",
  "/business/settings/checkout-advanced",
  "/business/settings/appearance",
  "/business/settings/business-hours",
  "/business/settings/web-chat",
  "/business/settings/scheduling-options",
  "/business/settings/express-booking",
  "/business/settings/display-preferences",
  "/business/settings/waiting-room",
  "/business/settings/cancel-reschedule",
  "/business/settings/payment-account",
  "/business/settings/quick-tools",
  "/business/settings/online-booking",
  "/business/settings/online-booking/preferences",
  "/business/settings/online-booking/staff-selection",
] as const;

export function usesSettingsFormShell(pathname: string): boolean {
  const normalized =
    pathname.endsWith("/") && pathname.length > 1
      ? pathname.slice(0, -1)
      : pathname;

  return SETTINGS_FORM_SHELL_PATH_PREFIXES.some(
    (prefix) => normalized === prefix,
  );
}
