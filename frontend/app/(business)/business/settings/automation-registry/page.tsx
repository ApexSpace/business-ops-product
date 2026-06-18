import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const AutomationRegistryPage = dynamic(
  () =>
    import("@/features/automations/pages/automation-registry-page").then(
      (m) => m.AutomationRegistryPage,
    ),
  {
    loading: () => <Skeleton className="min-h-[16rem] w-full" />,
  },
);

export default function Page() {
  return <AutomationRegistryPage />;
}
