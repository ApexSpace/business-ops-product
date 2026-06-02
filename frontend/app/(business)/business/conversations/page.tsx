import { ComingSoon } from "@/components/shared/coming-soon";
import { PageHeader } from "@/components/layout/page-header";

export default function BusinessConversationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader />
      <ComingSoon title="Unified inbox" />
    </div>
  );
}
