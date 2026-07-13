import type { PublicBookingSlot } from "@/features/public-booking/schemas/public-booking";

export type WaitlistStatus =
  | "WAITING"
  | "MATCHED"
  | "BOOKED"
  | "DISMISSED"
  | "EXPIRED"
  | "CANCELLED";

export type WaitlistSource = "ONLINE_BOOKING" | "STAFF_MANUAL";

export interface WaitlistEntry {
  id: string;
  businessId: string;
  calendarId?: string | null;
  calendarName?: string | null;
  contact: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  };
  service: {
    id: string;
    name: string;
    durationMinutes: number;
    price?: number | null;
  };
  additionalServiceIds: string[];
  staff?: { id: string; name: string } | null;
  preferredDate: string;
  preferredMorning: boolean;
  preferredAfternoon: boolean;
  preferredEvening: boolean;
  comments?: string | null;
  status: WaitlistStatus;
  source: WaitlistSource;
  matchedOpenings: PublicBookingSlot[];
  hasOpening: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WaitlistSummary {
  matchedCount: number;
  waitingCount: number;
}

export interface WaitlistListFilters {
  page?: number;
  limit?: number;
  status?: WaitlistStatus;
  staffId?: string;
  calendarId?: string;
  preferredDate?: string;
  hasOpening?: boolean;
}

export interface WaitlistBookResult {
  entry: WaitlistEntry;
  appointmentId: string;
}
