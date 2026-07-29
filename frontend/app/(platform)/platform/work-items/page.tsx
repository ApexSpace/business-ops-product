import {
  WorkItemsHostProvider,
  PLATFORM_WORK_ITEMS_HOST,
} from "@/features/work-items/work-items-host-context";
import { WorkItemsPage } from "@/features/work-items/pages/work-items-page";

export default function PlatformWorkItemsPage() {
  return (
    <WorkItemsHostProvider value={PLATFORM_WORK_ITEMS_HOST}>
      <WorkItemsPage />
    </WorkItemsHostProvider>
  );
}
