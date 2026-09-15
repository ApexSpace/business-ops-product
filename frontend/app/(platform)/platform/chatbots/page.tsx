import {
  ChatbotsHostProvider,
  PLATFORM_CHATBOTS_HOST,
} from "@/features/chatbots/chatbots-host-context";
import { BusinessChatbotsSettings } from "@/features/chatbots/components/business-chatbots-settings";

export default function PlatformChatbotsPage() {
  return (
    <ChatbotsHostProvider value={PLATFORM_CHATBOTS_HOST}>
      <BusinessChatbotsSettings />
    </ChatbotsHostProvider>
  );
}
