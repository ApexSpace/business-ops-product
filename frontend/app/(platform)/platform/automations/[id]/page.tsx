import {
  AutomationsHostProvider,
  PLATFORM_AUTOMATIONS_HOST,
} from "@/features/automations/automations-host-context";
import { AutomationWorkflowEditorPage } from "@/features/automations/components/automation-workflow-editor-page";

export default function PlatformAutomationsEditPage() {
  return (
    <AutomationsHostProvider value={PLATFORM_AUTOMATIONS_HOST}>
      <AutomationWorkflowEditorPage />
    </AutomationsHostProvider>
  );
}
