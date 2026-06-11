import { ConversationsInbox } from "@/features/conversations/components/conversations-inbox";
import { PageHeader } from "@/components/layout/page-header";

export default function BusinessConversationsPage() {
  return (
    <div className="flex min-h-0 flex-col gap-6">
      <PageHeader className="shrink-0" />
      <div className="min-h-0 flex-1">
        <ConversationsInbox />
      </div>
    </div>
  );
}
