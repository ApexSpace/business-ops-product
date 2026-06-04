import type { SelectOption } from "@/components/forms/select-field";

export const businessStatusFilterOptions: SelectOption[] = [
  { value: "all", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "ARCHIVED", label: "Archived" },
];

export const businessStatusOptions: SelectOption[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "ARCHIVED", label: "Archived" },
];

export const platformRoleFilterOptions: SelectOption[] = [
  { value: "all", label: "All Roles" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "PLATFORM_ADMIN", label: "Platform Admin" },
  { value: "SUPPORT", label: "Support" },
];

export const platformRoleOptions: SelectOption[] = [
  { value: "PLATFORM_ADMIN", label: "Platform Admin" },
  { value: "SUPPORT", label: "Support" },
];

export const planStatusFilterOptions: SelectOption[] = [
  { value: "all", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "ARCHIVED", label: "Archived" },
];

export const subscriptionStatusFilterOptions: SelectOption[] = [
  { value: "all", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "TRIALING", label: "Trialing" },
  { value: "PAST_DUE", label: "Past Due" },
  { value: "CANCELED", label: "Canceled" },
];

export const subscriptionStatusOptions: SelectOption[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "TRIALING", label: "Trialing" },
  { value: "PAST_DUE", label: "Past Due" },
  { value: "CANCELED", label: "Canceled" },
];

export const industryStatusFilterOptions: SelectOption[] = [
  { value: "all", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "ARCHIVED", label: "Archived" },
];

export const industryStatusOptions: SelectOption[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "ARCHIVED", label: "Archived" },
];
