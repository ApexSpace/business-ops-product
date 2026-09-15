import {
  ChatbotsHostProvider,
  PLATFORM_CHATBOTS_HOST,
} from "@/features/chatbots/chatbots-host-context";
import { ChatbotEditSettings } from "@/features/chatbots/components/chatbot-edit-settings";

export default async function PlatformChatbotEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ChatbotsHostProvider value={PLATFORM_CHATBOTS_HOST}>
      <ChatbotEditSettings chatbotId={id} />
    </ChatbotsHostProvider>
  );
}
