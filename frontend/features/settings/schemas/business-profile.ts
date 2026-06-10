import { z } from "zod";
import type { Business, BusinessStatus } from "@/features/settings/types";
import {
  apiPhoneToFormValue,
  hasPhoneDigits,
  phoneToApiFields,
} from "@/lib/forms/phone";
import { normalizeCurrencyCode } from "@/features/payments/utils/currencies";
import { taxesAndCurrencySchema } from "@/features/settings/schemas/financial-settings-profile";

export const businessProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  displayName: z.string().max(200).optional(),
  email: z.string().email("Valid email is required").max(255),
  name: z.string().min(2, "Business name is required").max(200),
  industryId: z.string().uuid("Select an industry"),
  snapshotId: z.string().uuid().optional().or(z.literal("")),
  phone: z
    .string()
    .min(1, "Phone is required")
    .refine((v) => hasPhoneDigits(v), {
      message: "Enter a valid phone number",
    }),
  address: z.string().max(255).optional(),
  addressLine2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  zip: z.string().max(20).optional(),
  website: z
    .string()
    .max(500)
    .optional()
    .refine(
      (v) => !v || v === "" || /^https?:\/\/.+/i.test(v),
      "Website must start with http:// or https://",
    ),
  logoUrl: z
    .string()
    .max(500)
    .optional()
    .refine(
      (v) => !v || v === "" || /^https?:\/\/.+/i.test(v),
      "Logo URL must start with http:// or https://",
    ),
  timezone: z.string().min(1, "Timezone is required"),
  taxesAndCurrency: taxesAndCurrencySchema,
  status: z.enum(["ACTIVE", "NOT_ACTIVE", "SUSPENDED", "ARCHIVED"]).optional(),
});

export type BusinessProfileFormValues = z.infer<typeof businessProfileSchema>;

export const businessProfileDefaultValues: BusinessProfileFormValues = {
  firstName: "",
  lastName: "",
  displayName: "",
  email: "",
  name: "",
  industryId: "",
  snapshotId: "",
  phone: "",
  address: "",
  addressLine2: "",
  city: "",
  state: "",
  country: "",
  zip: "",
  website: "",
  logoUrl: "",
  timezone: "America/New_York",
  taxesAndCurrency: {
    currencyCode: "USD",
    defaultTaxRate: 0,
    pricesIncludeTax: false,
  },
  status: "ACTIVE",
};

export function buildDisplayName(firstName?: string, lastName?: string): string {
  return [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ").trim();
}

export function businessToProfileForm(
  business: Business,
  options?: { includeStatus?: boolean },
): BusinessProfileFormValues {
  const values: BusinessProfileFormValues = {
    ...businessProfileDefaultValues,
    firstName: business.firstName ?? "",
    lastName: business.lastName ?? "",
    displayName: business.displayName ?? "",
    email: business.email ?? "",
    name: business.name,
    industryId: business.industryId ?? business.industry?.id ?? "",
    phone: apiPhoneToFormValue(
      null,
      business.phoneCountryCode,
      business.phoneNumber,
    ),
    address: business.address ?? "",
    addressLine2: business.addressLine2 ?? "",
    city: business.city ?? "",
    state: business.state ?? "",
    country: business.country ?? "",
    zip: business.zip ?? "",
    website: business.website ?? "",
    logoUrl: business.logoUrl ?? "",
    timezone: business.timezone ?? "America/New_York",
    taxesAndCurrency: business.taxesAndCurrency
      ? {
          currencyCode: normalizeCurrencyCode(
            business.taxesAndCurrency.currencyCode,
          ),
          defaultTaxRate: business.taxesAndCurrency.defaultTaxRate ?? 0,
          pricesIncludeTax: business.taxesAndCurrency.pricesIncludeTax ?? false,
        }
      : businessProfileDefaultValues.taxesAndCurrency,
  };

  if (options?.includeStatus) {
    values.status = business.status;
  }

  if ("snapshotId" in business && business.snapshotId) {
    values.snapshotId = business.snapshotId;
  }

  return values;
}

export function profileFormToApiBody(values: BusinessProfileFormValues): {
  name: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  industryId: string;
  snapshotId?: string;
  phoneCountryCode: string;
  phoneNumber: string;
  address?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
  website?: string;
  logoUrl?: string;
  timezone: string;
  taxesAndCurrency: {
    currencyCode: string;
    defaultTaxRate: number;
    pricesIncludeTax: boolean;
  };
  status?: BusinessStatus;
} {
  const displayName = buildDisplayName(values.firstName, values.lastName);
  const phoneFields = phoneToApiFields(values.phone);

  return {
    name: values.name.trim(),
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    displayName,
    email: values.email.trim(),
    industryId: values.industryId,
    phoneCountryCode: phoneFields.phoneCountryCode ?? "+1",
    phoneNumber: phoneFields.phoneNumber ?? "",
    address: values.address?.trim() || undefined,
    addressLine2: values.addressLine2?.trim() || undefined,
    city: values.city?.trim() || undefined,
    state: values.state?.trim() || undefined,
    country: values.country?.trim() || undefined,
    zip: values.zip?.trim() || undefined,
    website: values.website?.trim() || undefined,
    logoUrl: values.logoUrl?.trim() || undefined,
    timezone: values.timezone,
    taxesAndCurrency: {
      currencyCode: normalizeCurrencyCode(values.taxesAndCurrency.currencyCode),
      defaultTaxRate: values.taxesAndCurrency.defaultTaxRate,
      pricesIncludeTax: values.taxesAndCurrency.pricesIncludeTax,
    },
    ...(values.status ? { status: values.status } : {}),
    ...(values.snapshotId?.trim()
      ? { snapshotId: values.snapshotId.trim() }
      : {}),
  };
}
