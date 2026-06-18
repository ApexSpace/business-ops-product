import dynamic from "next/dynamic";
import { ListPageSkeleton } from "@/components/layout/list-page";

const AutomationsListPage = dynamic(
  () =>
    import("@/features/automations/pages/automations-list-page").then(
      (m) => m.AutomationsListPage,
    ),
  { loading: () => <ListPageSkeleton /> },
);

export default function Page() {
  return <AutomationsListPage />;
}
