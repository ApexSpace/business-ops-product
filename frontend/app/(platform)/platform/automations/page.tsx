import {
  AutomationsHostProvider,
  PLATFORM_AUTOMATIONS_HOST,
} from "@/features/automations/automations-host-context";
import { AutomationsListPage } from "@/features/automations/pages/automations-list-page";

export default function PlatformAutomationsPage() {
  return (
    <AutomationsHostProvider value={PLATFORM_AUTOMATIONS_HOST}>
      <AutomationsListPage />
    </AutomationsHostProvider>
  );
}
