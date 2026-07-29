import dynamic from "next/dynamic";
import { ListPageSkeleton } from "@/components/layout/list-page";
import {
  AutomationsHostProvider,
  BUSINESS_AUTOMATIONS_HOST,
} from "@/features/automations/automations-host-context";

const AutomationsListPage = dynamic(
  () =>
    import("@/features/automations/pages/automations-list-page").then(
      (m) => m.AutomationsListPage,
    ),
  { loading: () => <ListPageSkeleton /> },
);

export default function Page() {
  return (
    <AutomationsHostProvider value={BUSINESS_AUTOMATIONS_HOST}>
      <AutomationsListPage />
    </AutomationsHostProvider>
  );
}
