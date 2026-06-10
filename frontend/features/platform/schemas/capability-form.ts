import { z } from "zod";

const stableKeyRegex = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$/;

export const capabilityKeySchema = z
  .string()
  .min(2, "Key is required")
  .regex(
    stableKeyRegex,
    "Use lowercase letters, numbers, underscores, and dots (e.g. crm.contacts)",
  );

export const createCapabilitySchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE"]).optional(),
});

export const manualRegistryFeatureSchema = z.object({
  key: capabilityKeySchema,
  moduleKey: capabilityKeySchema,
  moduleName: z.string().min(2, "Module name is required"),
  name: z.string().min(2, "Feature name is required"),
  description: z.string().optional(),
  permissionKey: z.string().optional(),
  defaultEnabled: z.boolean().optional(),
  isBillable: z.boolean().optional(),
});

export const updateCapabilitySchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  metadataJson: z.string().optional(),
});

export const capabilityModuleSchema = z.object({
  key: capabilityKeySchema,
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  sortOrder: z.number().int().min(0).optional(),
});

export const capabilityFeatureSchema = z.object({
  key: capabilityKeySchema,
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  moduleId: z.string().optional(),
  status: z.enum(["INTERNAL", "BETA", "ACTIVE", "DISABLED", "DEPRECATED"]),
  defaultEnabled: z.boolean(),
  isBillable: z.boolean(),
  permissionKey: z.string().optional(),
  limitKey: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const capabilityFeatureUpdateSchema = z.object({
  name: z.string().min(2, "Name is required").optional(),
  description: z.string().optional(),
  moduleId: z.string().optional(),
  status: z
    .enum(["INTERNAL", "BETA", "ACTIVE", "DISABLED", "DEPRECATED"])
    .optional(),
  defaultEnabled: z.boolean().optional(),
  isBillable: z.boolean().optional(),
  permissionKey: z.string().optional(),
  limitKey: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const capabilityPermissionSchema = z.object({
  key: capabilityKeySchema,
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  featureId: z.string().optional(),
});

export const capabilityLimitSchema = z.object({
  key: capabilityKeySchema,
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  unit: z.string().min(1, "Unit is required"),
  defaultValue: z.number(),
});

export const capabilityNavigationSchema = z.object({
  key: capabilityKeySchema,
  label: z.string().min(2, "Label is required"),
  route: z.string().min(1, "Route is required"),
  icon: z.string().optional(),
  moduleId: z.string().optional(),
  requiredFeatureKey: z.string().optional(),
  requiredPermissionKey: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  sortOrder: z.number().int().min(0).optional(),
});

export const capabilityConfigSchemaFormSchema = z.object({
  schemaKey: capabilityKeySchema,
  name: z.string().optional(),
  description: z.string().optional(),
  schemaJson: z.string().min(2, "Schema JSON is required"),
  defaultConfigJson: z.string().optional(),
});

export type CreateCapabilityValues = z.infer<typeof createCapabilitySchema>;
export type UpdateCapabilityValues = z.infer<typeof updateCapabilitySchema>;
export type CapabilityModuleValues = z.infer<typeof capabilityModuleSchema>;
export type CapabilityFeatureValues = z.infer<typeof capabilityFeatureSchema>;
export type CapabilityFeatureUpdateValues = z.infer<
  typeof capabilityFeatureUpdateSchema
>;
export type CapabilityPermissionValues = z.infer<
  typeof capabilityPermissionSchema
>;
export type CapabilityLimitValues = z.infer<typeof capabilityLimitSchema>;
export type CapabilityNavigationValues = z.infer<
  typeof capabilityNavigationSchema
>;
export type CapabilityConfigSchemaValues = z.infer<
  typeof capabilityConfigSchemaFormSchema
>;
export type ManualRegistryFeatureValues = z.infer<
  typeof manualRegistryFeatureSchema
>;

export function parseJsonField(
  value: string | undefined,
  fieldLabel: string,
): Record<string, unknown> | undefined {
  if (!value?.trim()) return undefined;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`${fieldLabel} must be a JSON object`);
    }
    return parsed as Record<string, unknown>;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid JSON";
    throw new Error(message);
  }
}
