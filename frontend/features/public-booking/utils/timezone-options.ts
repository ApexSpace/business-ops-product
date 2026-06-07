import { DateTime } from "luxon";

const CURATED = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Vancouver",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
  "UTC",
];

export type TimezoneOption = { value: string; label: string };

function formatTzLabel(tz: string): string {
  const now = DateTime.now().setZone(tz);
  const offset = now.toFormat("ZZZZ");
  const friendly = tz.replace(/_/g, " ").replace(/\//g, " / ");
  return `(${offset}) ${friendly}`;
}

export function getTimezoneOptions(): TimezoneOption[] {
  let zones: string[] = CURATED;
  try {
    const supported = (
      Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }
    ).supportedValuesOf?.("timeZone");
    if (supported?.length) {
      zones = [...new Set([...CURATED, ...supported])].sort();
    }
  } catch {
    /* use curated */
  }
  return zones.map((value) => ({ value, label: formatTzLabel(value) }));
}
