import { ConversationsInbox } from "@/components/conversations/conversations-inbox";
import { PageHeader } from "@/components/layout/page-header";

export default function BusinessConversationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader />
      <ConversationsInbox />
    </div>
  );
}
