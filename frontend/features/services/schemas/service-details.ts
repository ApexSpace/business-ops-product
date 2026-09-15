import { z } from "zod";
import type { Service } from "@/features/services/types";

const optionalNumberString = z.string();

export const serviceDetailsSchema = z
  .object({
    name: z.string().trim().min(1, "Service name is required").max(200),
    description: z.string().max(2000).optional().or(z.literal("")),
    price: z.string().optional().or(z.literal("")),
    durationMinutes: z.string().min(1, "Duration is required"),
    hasProcessingTime: z.boolean(),
    processingDurationMinutes: optionalNumberString,
    finishDurationMinutes: optionalNumberString,
    hasBufferTime: z.boolean(),
    bufferBeforeMinutes: optionalNumberString,
    bufferAfterMinutes: optionalNumberString,
    usesProducts: z.boolean(),
    requiresNoStaff: z.boolean(),
    requiresTwoStaff: z.boolean(),
    hasCommissionDeduction: z.boolean(),
    commissionDeductionType: z.enum(["FLAT", "PERCENT"]),
    commissionDeductionValue: optionalNumberString,
    postCommissionDeductionType: z.enum(["FLAT", "PERCENT"]),
    postCommissionDeductionValue: optionalNumberString,
    isDemo: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.requiresNoStaff && values.requiresTwoStaff) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cannot require no staff and two staff at the same time",
        path: ["requiresTwoStaff"],
      });
    }
  });

export type ServiceDetailsFormValues = z.infer<typeof serviceDetailsSchema>;

export const serviceDetailsDefaults: ServiceDetailsFormValues = {
  name: "",
  description: "",
  price: "",
  durationMinutes: "60",
  hasProcessingTime: false,
  processingDurationMinutes: "30",
  finishDurationMinutes: "",
  hasBufferTime: false,
  bufferBeforeMinutes: "0",
  bufferAfterMinutes: "15",
  usesProducts: false,
  requiresNoStaff: false,
  requiresTwoStaff: false,
  hasCommissionDeduction: false,
  commissionDeductionType: "PERCENT",
  commissionDeductionValue: "",
  postCommissionDeductionType: "PERCENT",
  postCommissionDeductionValue: "",
  isDemo: false,
};

export function serviceToDetailsForm(service: Service): ServiceDetailsFormValues {
  return {
    name: service.name,
    description: service.description ?? "",
    price: service.price ?? "",
    durationMinutes: String(service.durationMinutes ?? 60),
    hasProcessingTime: service.hasProcessingTime,
    processingDurationMinutes: String(service.processingDurationMinutes ?? 0),
    finishDurationMinutes: service.finishDurationMinutes
      ? String(service.finishDurationMinutes)
      : "",
    hasBufferTime: service.hasBufferTime,
    bufferBeforeMinutes: String(service.bufferBeforeMinutes ?? 0),
    bufferAfterMinutes: String(service.bufferAfterMinutes ?? 0),
    usesProducts: service.usesProducts,
    requiresNoStaff: service.requiresNoStaff,
    requiresTwoStaff: service.requiresTwoStaff,
    hasCommissionDeduction: service.hasCommissionDeduction,
    commissionDeductionType: service.commissionDeductionType ?? "PERCENT",
    commissionDeductionValue: service.commissionDeductionValue ?? "",
    postCommissionDeductionType:
      service.postCommissionDeductionType ?? "PERCENT",
    postCommissionDeductionValue: service.postCommissionDeductionValue ?? "",
    isDemo: service.isDemo,
  };
}

export function detailsFormToApiBody(
  values: ServiceDetailsFormValues,
): Record<string, unknown> {
  return {
    name: values.name.trim(),
    description: values.description?.trim() || null,
    price: values.price ? Number(values.price) : null,
    durationMinutes: Number(values.durationMinutes),
    hasProcessingTime: values.hasProcessingTime,
    processingDurationMinutes: values.hasProcessingTime
      ? Number(values.processingDurationMinutes || 0)
      : 0,
    finishDurationMinutes:
      values.hasProcessingTime && values.finishDurationMinutes
        ? Number(values.finishDurationMinutes)
        : null,
    hasBufferTime: values.hasBufferTime,
    bufferBeforeMinutes: values.hasBufferTime
      ? Number(values.bufferBeforeMinutes || 0)
      : 0,
    bufferAfterMinutes: values.hasBufferTime
      ? Number(values.bufferAfterMinutes || 0)
      : 0,
    usesProducts: values.usesProducts,
    requiresNoStaff: values.requiresNoStaff,
    requiresTwoStaff: values.requiresTwoStaff,
    hasCommissionDeduction: values.hasCommissionDeduction,
    commissionDeductionType: values.hasCommissionDeduction
      ? values.commissionDeductionType
      : null,
    commissionDeductionValue:
      values.hasCommissionDeduction && values.commissionDeductionValue
        ? Number(values.commissionDeductionValue)
        : null,
    postCommissionDeductionType: values.hasCommissionDeduction
      ? values.postCommissionDeductionType
      : null,
    postCommissionDeductionValue:
      values.hasCommissionDeduction && values.postCommissionDeductionValue
        ? Number(values.postCommissionDeductionValue)
        : null,
    isDemo: values.isDemo,
  };
}

export function formatServicePrice(price: string | null | undefined): string {
  if (!price) return "Not set";
  const n = Number(price);
  if (Number.isNaN(n)) return price;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(n);
}

export function formatDurationMinutes(minutes: number | null | undefined): string {
  if (minutes == null) return "Not set";
  return `${minutes} min`;
}

export function formatCommissionValue(
  value: string | null | undefined,
  type: "FLAT" | "PERCENT" | null | undefined,
): string {
  if (!value) return "Not set";
  if (type === "PERCENT") return `${value}%`;
  return formatServicePrice(value);
}
