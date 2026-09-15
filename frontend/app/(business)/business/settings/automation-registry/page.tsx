import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AutomationsHostProvider,
  BUSINESS_AUTOMATIONS_HOST,
} from "@/features/automations/automations-host-context";

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
  return (
    <AutomationsHostProvider value={BUSINESS_AUTOMATIONS_HOST}>
      <AutomationRegistryPage />
    </AutomationsHostProvider>
  );
}
