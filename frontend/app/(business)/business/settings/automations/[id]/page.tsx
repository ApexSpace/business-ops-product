import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const AutomationWorkflowEditorPage = dynamic(
  () =>
    import(
      "@/features/automations/components/automation-workflow-editor-page"
    ).then((m) => m.AutomationWorkflowEditorPage),
  {
    loading: () => <Skeleton className="min-h-[24rem] w-full" />,
  },
);

export default function Page() {
  return <AutomationWorkflowEditorPage />;
}
