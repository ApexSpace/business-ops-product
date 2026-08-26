export const BUSINESS_PROFILE_TABS = [
  { value: "contact", label: "Contact" },
  { value: "business", label: "Business" },
  { value: "address", label: "Address" },
  { value: "regional", label: "Regional & tax" },
  { value: "hours", label: "Business hours" },
] as const;

export type BusinessProfileTab =
  (typeof BUSINESS_PROFILE_TABS)[number]["value"];

export const BUSINESS_PROFILE_TAB_META: Record<
  BusinessProfileTab,
  { title: string; description: string }
> = {
  business: {
    title: "Business Details",
    description: "Edit legal name, industry, and branding for this workspace.",
  },
  contact: {
    title: "Primary contact",
    description:
      "Contact person details used across invoices, booking, and notifications.",
  },
  address: {
    title: "Locations",
    description:
      "Physical address shown on invoices, estimates, and public pages.",
  },
  regional: {
    title: "Regional & tax",
    description: "Website, timezone, currency, and default tax settings.",
  },
  hours: {
    title: "Business Hours",
    description: "Manage your business hours.",
  },
};

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
  return "business";
}
