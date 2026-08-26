import { DateTime } from "luxon";

export type TimePickerValue = {
  hour: string;
  minute: string;
  period: "AM" | "PM";
};

export function emptyTimePicker(): TimePickerValue {
  return { hour: "", minute: "", period: "AM",
};
}

export function hmToTimePicker(hm: string): TimePickerValue {
  const [h, m] = hm.split(":").map((v) => Number(v));
  const period: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return {
    hour: String(hour12).padStart(2, "0"),
    minute: String(m).padStart(2, "0"),
    period,
  };
}

export function timePickerToHm(value: TimePickerValue): string | null {
  if (!value.hour || !value.minute) return null;
  let hour = Number(value.hour);
  const minute = Number(value.minute);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  if (value.period === "AM") {
    if (hour === 12) hour = 0;
  } else if (hour !== 12) {
    hour += 12;
  }
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function isoToTimePicker(iso: string, timezone: string): TimePickerValue {
  const dt = DateTime.fromISO(iso, { zone: "utc" }).setZone(timezone);
  return hmToTimePicker(dt.toFormat("HH:mm"));
}
