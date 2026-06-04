import { api } from "@/lib/api/client";
import type { FinancialSettingsResponse } from "@/features/settings/schemas/financial-settings-profile";

export function getFinancialSettings() {
  return api.get<FinancialSettingsResponse>(
    "businesses/current/financial-settings",
  );
}

export function updateFinancialSettings(body: Record<string, unknown>) {
  return api.patch<FinancialSettingsResponse>(
    "businesses/current/financial-settings",
    body,
  );
}
