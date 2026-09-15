import {
  ChatbotsHostProvider,
  BUSINESS_CHATBOTS_HOST,
} from "@/features/chatbots/chatbots-host-context";
import { ChatbotEditSettings } from "@/features/chatbots/components/chatbot-edit-settings";

export default async function ChatbotEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ChatbotsHostProvider value={BUSINESS_CHATBOTS_HOST}>
      <ChatbotEditSettings chatbotId={id} />
    </ChatbotsHostProvider>
  );
}
