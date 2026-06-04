import { z } from "zod";
import {
  currencySelectOptions,
} from "@/features/payments/utils/currencies";

export const taxesAndCurrencySchema = z.object({
  currencyCode: z
    .string()
    .min(1, "Select a currency")
    .refine(
      (code) =>
        currencySelectOptions.some((option) => option.value === code),
      "Select a supported currency",
    ),
  defaultTaxRate: z.number().min(0).max(100),
  pricesIncludeTax: z.boolean(),
});

export const invoiceSettingsSchema = z.object({
  prefix: z
    .string()
    .min(1, "Prefix required")
    .max(10, "Max 10 characters"),
  nextNumber: z.number().int().min(1, "Must be a positive integer"),
  defaultPaymentTerms: z.string().max(500),
  defaultNotes: z.string().max(5000),
  defaultTermsAndConditions: z.string().max(10000),
  showLogo: z.boolean(),
  showBusinessAddress: z.boolean(),
  showPaymentInstructions: z.boolean(),
});

export const estimateSettingsSchema = z.object({
  prefix: z
    .string()
    .min(1, "Prefix required")
    .max(10, "Max 10 characters"),
  nextNumber: z.number().int().min(1, "Must be a positive integer"),
  defaultExpiryDays: z.number().int().min(1),
  defaultNotes: z.string().max(5000),
  defaultTermsAndConditions: z.string().max(10000),
  showLogo: z.boolean(),
  showBusinessAddress: z.boolean(),
});

export const financialSettingsSchema = z.object({
  invoice: invoiceSettingsSchema,
  estimate: estimateSettingsSchema,
});

export type InvoiceSettingsFormValues = z.infer<typeof invoiceSettingsSchema>;
export type EstimateSettingsFormValues = z.infer<typeof estimateSettingsSchema>;
export type TaxesAndCurrencyFormValues = z.infer<typeof taxesAndCurrencySchema>;
export type FinancialSettingsFormValues = z.infer<
  typeof financialSettingsSchema
>;

export interface FinancialSettingsResponse {
  invoice: InvoiceSettingsFormValues & {
    nextInvoiceNumberPreview: string;
  };
  estimate: EstimateSettingsFormValues & {
    nextEstimateNumberPreview: string;
  };
  taxesAndCurrency: TaxesAndCurrencyFormValues;
}

export const financialSettingsDefaults: FinancialSettingsFormValues = {
  invoice: {
    prefix: "INV",
    nextNumber: 1,
    defaultPaymentTerms: "",
    defaultNotes: "",
    defaultTermsAndConditions: "",
    showLogo: true,
    showBusinessAddress: true,
    showPaymentInstructions: true,
  },
  estimate: {
    prefix: "EST",
    nextNumber: 1,
    defaultExpiryDays: 30,
    defaultNotes: "",
    defaultTermsAndConditions: "",
    showLogo: true,
    showBusinessAddress: true,
  },
};

export function financialSettingsToForm(
  data: FinancialSettingsResponse,
): FinancialSettingsFormValues {
  return {
    invoice: {
      prefix: data.invoice.prefix,
      nextNumber: data.invoice.nextNumber,
      defaultPaymentTerms: data.invoice.defaultPaymentTerms ?? "",
      defaultNotes: data.invoice.defaultNotes ?? "",
      defaultTermsAndConditions: data.invoice.defaultTermsAndConditions ?? "",
      showLogo: data.invoice.showLogo,
      showBusinessAddress: data.invoice.showBusinessAddress,
      showPaymentInstructions: data.invoice.showPaymentInstructions,
    },
    estimate: {
      prefix: data.estimate.prefix,
      nextNumber: data.estimate.nextNumber,
      defaultExpiryDays: data.estimate.defaultExpiryDays,
      defaultNotes: data.estimate.defaultNotes ?? "",
      defaultTermsAndConditions: data.estimate.defaultTermsAndConditions ?? "",
      showLogo: data.estimate.showLogo,
      showBusinessAddress: data.estimate.showBusinessAddress,
    },
  };
}

export function financialSettingsFormToApiBody(
  values: FinancialSettingsFormValues,
) {
  return {
    invoice: {
      ...values.invoice,
      prefix: values.invoice.prefix.trim().toUpperCase(),
    },
    estimate: {
      ...values.estimate,
      prefix: values.estimate.prefix.trim().toUpperCase(),
    },
  };
}

export function parsePaymentTermsDays(terms: string): number | null {
  const trimmed = terms.trim();
  if (!trimmed) return null;
  const netMatch = /net\s*(\d+)/i.exec(trimmed);
  if (netMatch) return parseInt(netMatch[1], 10);
  const daysMatch = /(\d+)\s*days?/i.exec(trimmed);
  if (daysMatch) return parseInt(daysMatch[1], 10);
  return null;
}

export function addDaysToDateInput(baseIso: string, days: number): string {
  const d = new Date(baseIso);
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function computeDefaultTaxAmount(
  subtotal: number,
  taxRate: number,
  pricesIncludeTax: boolean,
): number {
  if (taxRate <= 0 || pricesIncludeTax) return 0;
  return Math.round(subtotal * (taxRate / 100) * 100) / 100;
}

export function applyInvoiceDefaults(
  base: import("@/features/invoices/schemas/invoice-profile").InvoiceFormValues,
  settings: FinancialSettingsResponse,
): import("@/features/invoices/schemas/invoice-profile").InvoiceFormValues {
  const issueDate = base.issueDate || new Date().toISOString().slice(0, 10);
  const termsDays = parsePaymentTermsDays(
    settings.invoice.defaultPaymentTerms,
  );
  const dueDate =
    base.dueDate ||
    (termsDays ? addDaysToDateInput(issueDate, termsDays) : "");

  return {
    ...base,
    issueDate,
    dueDate,
    notes: base.notes || settings.invoice.defaultNotes || "",
    paymentTerms: base.paymentTerms || settings.invoice.defaultPaymentTerms || "",
    termsAndConditions:
      base.termsAndConditions ||
      settings.invoice.defaultTermsAndConditions ||
      "",
    taxAmount:
      base.taxAmount ||
      computeDefaultTaxAmount(
        0,
        settings.taxesAndCurrency.defaultTaxRate,
        settings.taxesAndCurrency.pricesIncludeTax,
      ),
    invoiceNumberPreview: settings.invoice.nextInvoiceNumberPreview,
  };
}

export function applyEstimateDefaults(
  base: import("@/features/estimates/schemas/estimate-profile").EstimateFormValues,
  settings: FinancialSettingsResponse,
): import("@/features/estimates/schemas/estimate-profile").EstimateFormValues {
  const issueDate = base.issueDate || new Date().toISOString().slice(0, 10);
  const expiryDate =
    base.expiryDate ||
    addDaysToDateInput(issueDate, settings.estimate.defaultExpiryDays);

  return {
    ...base,
    issueDate,
    expiryDate,
    notes: base.notes || settings.estimate.defaultNotes || "",
    termsAndConditions:
      base.termsAndConditions ||
      settings.estimate.defaultTermsAndConditions ||
      "",
    taxAmount:
      base.taxAmount ||
      computeDefaultTaxAmount(
        0,
        settings.taxesAndCurrency.defaultTaxRate,
        settings.taxesAndCurrency.pricesIncludeTax,
      ),
    estimateNumberPreview: settings.estimate.nextEstimateNumberPreview,
  };
}
