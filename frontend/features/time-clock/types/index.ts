export type TimeCardStaff = {
  id: string;
  name: string;
};

export type TimeCardListItem = {
  id: string;
  day: string;
  dayDisplay: string;
  staff: TimeCardStaff;
  clockInTime: string;
  clockOutTime: string | null;
  paidMinutes: number | null;
  paidHoursDisplay: string | null;
  notes: string | null;
};

export type TimeCardDetail = TimeCardListItem & {
  clockInTimeIso: string;
  clockOutTimeIso: string | null;
};

export type VerifyPinResult = {
  staffId: string;
  staffName: string;
  isCurrentlyClockedIn: boolean;
  clockedInSince: string | null;
};

export type ClockInResult = {
  staffName: string;
  clockInTime: string;
  message: string;
};

export type ClockOutResult = {
  staffName: string;
  clockOutTime: string;
  paidMinutes: number;
  paidHoursDisplay: string;
  message: string;
};

export type TimeCardsListFilters = {
  page?: number;
  limit?: number;
  staffId?: string;
  timePeriod?: "all" | "today" | "this_week" | "this_month" | "custom";
  startDate?: string;
  endDate?: string;
  sortBy?: "day" | "staff";
};

export type UpsertTimeCardBody = {
  staffId?: string;
  date?: string;
  clockInTime?: string;
  clockOutTime?: string;
  notes?: string;
};
