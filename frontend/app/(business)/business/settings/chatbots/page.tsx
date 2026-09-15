import {
  ChatbotsHostProvider,
  BUSINESS_CHATBOTS_HOST,
} from "@/features/chatbots/chatbots-host-context";
import { BusinessChatbotsSettings } from "@/features/chatbots/components/business-chatbots-settings";

export default function BusinessChatbotsSettingsPage() {
  return (
    <ChatbotsHostProvider value={BUSINESS_CHATBOTS_HOST}>
      <BusinessChatbotsSettings />
    </ChatbotsHostProvider>
  );
}
