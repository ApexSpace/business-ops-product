import { ConversationsInbox } from "@/features/conversations/components/conversations-inbox";

export default function BusinessConversationsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ConversationsInbox />
    </div>
  );
}