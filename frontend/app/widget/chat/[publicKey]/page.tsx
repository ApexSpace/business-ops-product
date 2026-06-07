"use client";

import { use } from "react";
import { PublicChatbotWidget } from "@/features/public-chatbot/components/public-chatbot-widget";

export default function WidgetChatPage({
  params,
}: {
  params: Promise<{ publicKey: string }>;
}) {
  const { publicKey } = use(params);
  return (
    <div className="min-h-svh bg-transparent p-0">
      <PublicChatbotWidget publicKey={publicKey} embedded />
    </div>
  );
}
