import type { SelectOption } from "@/components/forms/select-field";

export const memberRoleOptions: SelectOption[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "MEMBER", label: "Normal" },
];

export const staffGenderOptions: SelectOption[] = [
  { value: "FEMALE", label: "Female" },
  { value: "MALE", label: "Male" },
  { value: "NON_BINARY", label: "Non-binary" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
];
