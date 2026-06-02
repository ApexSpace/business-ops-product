import { z } from "zod";
import {
  apiPhoneToFormValue,
  hasPhoneDigits,
  parseE164Phone,
  phoneToApiFields,
  toE164Phone,
} from "@/lib/phone";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[\d\s\-().]{7,}$/;

const phoneSchema = z
  .string()
  .max(20)
  .optional()
  .or(z.literal(""))
  .refine((v) => !v || hasPhoneDigits(v), {
    message: "Enter a valid phone number",
  });

export const quickContactSchema = z
  .object({
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    displayName: z.string().max(200).optional(),
    email: z
      .string()
      .max(255)
      .optional()
      .refine((v) => !v || emailPattern.test(v), {
        message: "Enter a valid email",
      }),
    phone: phoneSchema,
  })
  .refine(
    (data) => {
      const hasName =
        !!data.firstName?.trim() ||
        !!data.lastName?.trim() ||
        !!data.displayName?.trim();
      const hasEmail = !!data.email?.trim();
      const hasPhone = hasPhoneDigits(data.phone);
      return hasName || hasEmail || hasPhone;
    },
    {
      message: "Enter at least a name, email, or phone",
      path: ["displayName"],
    },
  );

export type QuickContactFormValues = z.infer<typeof quickContactSchema>;

export const quickContactDefaultValues: QuickContactFormValues = {
  firstName: "",
  lastName: "",
  displayName: "",
  email: "",
  phone: "",
};

export function parseContactSearchQuery(
  query: string,
): Partial<QuickContactFormValues> {
  const q = query.trim();
  if (!q) return {};

  if (emailPattern.test(q)) {
    return { email: q };
  }

  if (phonePattern.test(q)) {
    const parsed = parseE164Phone(q.startsWith("+") ? q : `+${q.replace(/\D/g, "")}`);
    if (parsed?.nationalDigits) {
      const e164 = toE164Phone(parsed.dialCode, parsed.nationalDigits);
      return e164 ? { phone: e164 } : {};
    }
    const digits = q.replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("1")) {
      const e164 = toE164Phone("+1", digits.slice(1));
      return e164 ? { phone: e164 } : {};
    }
    const e164 = toE164Phone("+1", digits);
    return e164 ? { phone: e164 } : {};
  }

  const parts = q.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(" "),
    };
  }
  return { displayName: q, firstName: q };
}

export function quickContactFormToApiBody(values: QuickContactFormValues) {
  const firstName = values.firstName?.trim() || undefined;
  const lastName = values.lastName?.trim() || undefined;
  const displayName =
    values.displayName?.trim() ||
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    undefined;

  const phoneFields = phoneToApiFields(values.phone);

  return {
    firstName,
    lastName,
    displayName,
    email: values.email?.trim() || undefined,
    phoneCountryCode: phoneFields.phoneCountryCode ?? undefined,
    phoneNumber: phoneFields.phoneNumber ?? undefined,
    source: "inline-picker",
  };
}

export function formatContactPickerLine(contact: {
  label: string;
  email?: string | null;
  phone?: string | null;
}): { primary: string; secondary: string | null } {
  const bits = [contact.phone, contact.email].filter(Boolean);
  return {
    primary: contact.label,
    secondary: bits.length > 0 ? bits.join(" · ") : null,
  };
}
