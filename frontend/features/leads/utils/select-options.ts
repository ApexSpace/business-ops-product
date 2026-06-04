import type { SelectOption } from "@/components/forms/select-field";

export const leadStatusFilterOptions: SelectOption[] = [
  { value: "all", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
  { value: "ARCHIVED", label: "Archived" },
];

export const leadStatusOptions: SelectOption[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
  { value: "ARCHIVED", label: "Archived" },
];
