"use client";

import { use } from "react";
import { PublicChatbotWidget } from "@/features/public-chatbot/components/public-chatbot-widget";

export default function PublicChatPage({
  params,
}: {
  params: Promise<{ publicKey: string }>;
}) {
  const { publicKey } = use(params);
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col p-4">
      <PublicChatbotWidget publicKey={publicKey} embedded />
    </div>
  );
}
