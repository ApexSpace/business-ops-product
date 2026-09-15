export type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export type BusinessHoursSlot = {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isEnabled: boolean;
};

export type BusinessHoursResponse = {
  slots: BusinessHoursSlot[];
};

export type StaffWorkScheduleResponse = {
  useBusinessHours: boolean;
  slots: BusinessHoursSlot[];
};
