import { z } from "zod";
import type { Contact } from "@/types/api";
import { buildDisplayName } from "@/lib/business-profile";
import { apiPhoneToFormValue, hasPhoneDigits, phoneToApiFields } from "@/lib/phone";

const phoneSchema = z
  .string()
  .max(20)
  .optional()
  .or(z.literal(""))
  .refine((v) => !v || hasPhoneDigits(v), {
    message: "Enter a valid phone number",
  });

export const contactProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  displayName: z.string().max(200).optional(),
  email: z
    .string()
    .max(255)
    .optional()
    .refine((v) => !v || z.string().email().safeParse(v).success, {
      message: "Valid email is required",
    }),
  companyName: z.string().max(200).optional(),
  phone: phoneSchema,
  timezone: z.string().min(1, "Timezone is required"),
  address: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  zip: z.string().max(20).optional(),
  avatarUrl: z.string().max(500_000).optional(),
});

export type ContactProfileFormValues = z.infer<typeof contactProfileSchema>;

export const contactProfileDefaultValues: ContactProfileFormValues = {
  firstName: "",
  lastName: "",
  displayName: "",
  email: "",
  companyName: "",
  phone: "",
  timezone: "America/New_York",
  address: "",
  city: "",
  state: "",
  country: "",
  zip: "",
  avatarUrl: "",
};

export function formatContactTableDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function contactToProfileForm(contact: Contact): ContactProfileFormValues {
  return {
    firstName: contact.firstName ?? "",
    lastName: contact.lastName ?? "",
    displayName: contact.displayName ?? "",
    email: contact.email ?? "",
    companyName: contact.companyName ?? "",
    phone: apiPhoneToFormValue(
      contact.phone,
      contact.phoneCountryCode,
      contact.phoneNumber,
    ),
    timezone: contact.timezone ?? "America/New_York",
    address: contact.address ?? "",
    city: contact.city ?? "",
    state: contact.state ?? "",
    country: contact.country ?? "",
    zip: contact.zip ?? "",
    avatarUrl: contact.avatarUrl ?? "",
  };
}

export function profileFormToApiBody(values: ContactProfileFormValues) {
  const displayName = buildDisplayName(values.firstName, values.lastName);
  const phoneFields = phoneToApiFields(values.phone);

  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    displayName,
    email: values.email?.trim() || undefined,
    companyName: values.companyName?.trim() || undefined,
    phoneCountryCode: phoneFields.phoneCountryCode,
    phoneNumber: phoneFields.phoneNumber,
    timezone: values.timezone,
    address: values.address?.trim() || undefined,
    city: values.city?.trim() || undefined,
    state: values.state?.trim() || undefined,
    country: values.country?.trim() || undefined,
    zip: values.zip?.trim() || undefined,
    avatarUrl: values.avatarUrl?.trim() || undefined,
  };
}
