import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const AutomationsSettingsPage = dynamic(
  () =>
    import("@/features/automations/components/automations-settings-page").then(
      (m) => m.AutomationsSettingsPage,
    ),
  {
    loading: () => <Skeleton className="min-h-[24rem] w-full" />,
  },
);

export default function Page() {
  return <AutomationsSettingsPage />;
}
