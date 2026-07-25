import {
  AutomationsHostProvider,
  PLATFORM_AUTOMATIONS_HOST,
} from "@/features/automations/automations-host-context";
import { WorkflowCreatePage } from "@/features/automations/pages/workflow-create-page";

export default function PlatformAutomationsNewPage() {
  return (
    <AutomationsHostProvider value={PLATFORM_AUTOMATIONS_HOST}>
      <WorkflowCreatePage />
    </AutomationsHostProvider>
  );
}
