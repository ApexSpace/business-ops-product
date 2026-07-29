import {
  ConversationsHostProvider,
  PLATFORM_CONVERSATIONS_HOST,
} from "@/features/conversations/conversations-host-context";
import { ConversationsInbox } from "@/features/conversations/components/conversations-inbox";
import { PlatformConversationsRealtimeProvider } from "@/features/conversations/components/platform-conversations-realtime-provider";

export default function PlatformConversationsPage() {
  return (
    <ConversationsHostProvider value={PLATFORM_CONVERSATIONS_HOST}>
      <PlatformConversationsRealtimeProvider>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ConversationsInbox />
        </div>
      </PlatformConversationsRealtimeProvider>
    </ConversationsHostProvider>
  );
}
