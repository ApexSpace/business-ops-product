import { z } from "zod";
import type { ServiceResourceType } from "@/features/resources/types";

export const capacityModeSchema = z.enum(["one", "specific", "unlimited"]);

export type CapacityMode = z.infer<typeof capacityModeSchema>;

export const resourceDetailsSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(200),
    resourceType: z.enum(["ROOM", "EQUIPMENT", "CONSUMABLE"]),
    groupId: z.string().optional().nullable(),
    status: z.enum(["ACTIVE", "INACTIVE"]),
    capacityMode: capacityModeSchema,
    capacityValue: z.number().int().min(1).max(100).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.capacityMode === "specific") {
      if (
        values.capacityValue === undefined ||
        Number.isNaN(values.capacityValue)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter the capacity",
          path: ["capacityValue"],
        });
      }
    }
  });

export type ResourceDetailsFormValues = z.infer<typeof resourceDetailsSchema>;

export function capacityToForm(
  capacity: number | null | undefined,
): Pick<ResourceDetailsFormValues, "capacityMode" | "capacityValue"> {
  if (capacity === null || capacity === undefined) {
    return { capacityMode: "unlimited", capacityValue: undefined };
  }
  if (capacity === 1) {
    return { capacityMode: "one", capacityValue: 1 };
  }
  return { capacityMode: "specific", capacityValue: capacity };
}

export function capacityFromForm(
  mode: CapacityMode,
  value: number | undefined,
): number | null {
  if (mode === "unlimited") return null;
  if (mode === "one") return 1;
  return value ?? 1;
}

export function capacitySummaryLabel(
  capacity: number | null | undefined,
): string {
  if (capacity === null || capacity === undefined) {
    return "No limit of appointments";
  }
  if (capacity === 1) {
    return "One appointment at a time";
  }
  return `Up to ${capacity} appointments`;
}

export function resourceDetailsFormToApiBody(
  values: ResourceDetailsFormValues,
): Record<string, unknown> {
  return {
    name: values.name.trim(),
    resourceType: values.resourceType as ServiceResourceType,
    groupId: values.groupId ? values.groupId : null,
    status: values.status,
    capacity: capacityFromForm(values.capacityMode, values.capacityValue),
  };
}
