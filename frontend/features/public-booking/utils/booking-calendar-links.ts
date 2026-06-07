import { DateTime } from "luxon";

export type CalendarLinkEvent = {
  title: string;
  description?: string;
  location?: string;
  startAt: string;
  endAt: string;
  timezone: string;
};

function formatIcsUtc(iso: string): string {
  return DateTime.fromISO(iso, { zone: "utc" })
    .toUTC()
    .toFormat("yyyyMMdd'T'HHmmss'Z'");
}

export function buildIcsContent(event: CalendarLinkEvent): string {
  const uid = `${event.startAt}-${event.title}@booking`.replace(/[^a-zA-Z0-9@.-]/g, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CodeSol//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatIcsUtc(new Date().toISOString())}`,
    `DTSTART:${formatIcsUtc(event.startAt)}`,
    `DTEND:${formatIcsUtc(event.endAt)}`,
    `SUMMARY:${event.title.replace(/\n/g, " ")}`,
  ];
  if (event.description) {
    lines.push(`DESCRIPTION:${event.description.replace(/\n/g, "\\n")}`);
  }
  if (event.location) {
    lines.push(`LOCATION:${event.location.replace(/\n/g, " ")}`);
  }
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcsFile(event: CalendarLinkEvent, filename = "appointment.ics") {
  const blob = new Blob([buildIcsContent(event)], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildGoogleCalendarUrl(event: CalendarLinkEvent): string {
  const start = formatIcsUtc(event.startAt);
  const end = formatIcsUtc(event.endAt);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${start}/${end}`,
  });
  if (event.location) params.set("location", event.location);
  if (event.description) params.set("details", event.description);
  return `https://calendar.google.com/calendar/render?${params}`;
}

export function buildOutlookCalendarUrl(event: CalendarLinkEvent): string {
  const start = DateTime.fromISO(event.startAt, { zone: "utc" }).toISO()!;
  const end = DateTime.fromISO(event.endAt, { zone: "utc" }).toISO()!;
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: start,
    enddt: end,
  });
  if (event.location) params.set("location", event.location);
  if (event.description) params.set("body", event.description);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params}`;
}

export function buildBookingDetailsText(params: {
  title: string;
  businessName: string;
  dateLabel: string;
  timeLabel: string;
  timezone: string;
  location?: string | null;
  customerName?: string;
}): string {
  const lines = [
    params.title,
    "",
    `Business: ${params.businessName}`,
    `Date: ${params.dateLabel}`,
    `Time: ${params.timeLabel}`,
    `Timezone: ${params.timezone}`,
  ];
  if (params.location) lines.push(`Location: ${params.location}`);
  if (params.customerName) lines.push(`Name: ${params.customerName}`);
  return lines.join("\n");
}
