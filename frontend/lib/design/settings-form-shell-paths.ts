/** Settings routes whose screens render title/description inside SettingsContentShell. */
const SETTINGS_FORM_SHELL_PATH_PREFIXES = [
  "/business/settings/profile",
  "/business/settings/financial",
  "/business/settings/appearance",
  "/business/settings/business-hours",
  "/business/settings/web-chat",
  "/business/settings/scheduling-options",
  "/business/settings/express-booking",
  "/business/settings/display-preferences",
  "/business/settings/waiting-room",
  "/business/settings/cancel-reschedule",
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
