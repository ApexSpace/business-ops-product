export const BUSINESS_PROFILE_TABS = [
  { value: "contact", label: "Contact" },
  { value: "business", label: "Business" },
  { value: "address", label: "Address" },
  { value: "regional", label: "Regional & tax" },
  { value: "hours", label: "Business hours" },
] as const;

export type BusinessProfileTab =
  (typeof BUSINESS_PROFILE_TABS)[number]["value"];

export function parseBusinessProfileTab(
  value: string | null,
): BusinessProfileTab {
  if (
    value === "contact" ||
    value === "business" ||
    value === "address" ||
    value === "regional" ||
    value === "hours"
  ) {
    return value;
  }
  return "contact";
}
