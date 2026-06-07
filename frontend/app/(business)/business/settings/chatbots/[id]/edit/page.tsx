import { use } from "react";
import { ChatbotEditSettings } from "@/features/chatbots/components/chatbot-edit-settings";

export default function ChatbotEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ChatbotEditSettings chatbotId={id} />;
}
