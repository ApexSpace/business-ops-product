import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const WorkflowCreatePage = dynamic(
  () =>
    import("@/features/automations/pages/workflow-create-page").then(
      (m) => m.WorkflowCreatePage,
    ),
  {
    loading: () => <Skeleton className="min-h-[24rem] w-full" />,
  },
);

export default function Page() {
  return <WorkflowCreatePage />;
}
