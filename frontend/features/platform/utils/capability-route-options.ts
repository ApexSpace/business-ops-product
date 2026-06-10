import { businessOperationalMenuItems } from "@/lib/config/navigation/business-menu";
import { businessSettingsNavItems } from "@/lib/config/navigation/business-settings-menu";
import type { SelectOption } from "@/components/forms/select-field";

const routes = [
  ...businessOperationalMenuItems.map((item) => item.href),
  ...businessSettingsNavItems.map((item) => item.href),
];

export const capabilityRouteOptions: SelectOption[] = routes.map((route) => ({
  value: route,
  label: route,
}));
