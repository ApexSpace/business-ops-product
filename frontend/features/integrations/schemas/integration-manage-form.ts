import { z } from "zod";

export const integrationManageFormSchema = z.object({
  connectedAccountName: z.string().max(255).optional(),
  connectedAccountEmail: z.string().email().optional().or(z.literal("")),
  configJson: z.string().optional(),
});

export type IntegrationManageFormValues = z.infer<
  typeof integrationManageFormSchema
>;

export function parseIntegrationConfigJson(
  value?: string,
): Record<string, unknown> | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    throw new Error("Config must be a JSON object");
  } catch {
    throw new Error("Config must be valid JSON");
  }
}

export function integrationFormToPayload(values: IntegrationManageFormValues) {
  const config = parseIntegrationConfigJson(values.configJson);
  return {
    connectedAccountName: values.connectedAccountName?.trim() || undefined,
    connectedAccountEmail: values.connectedAccountEmail?.trim() || undefined,
    ...(config ? { config } : {}),
  };
}
