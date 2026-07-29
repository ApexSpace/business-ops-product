"use client";

import { createContext, useContext, type ReactNode } from "react";

export type ChatbotsHostMode = "business" | "platform";

export type ChatbotsHostConfig = {
  mode: ChatbotsHostMode;
  /** UI route prefix */
  basePath: string;
  /** API path prefix */
  apiBase: string;
};

export const BUSINESS_CHATBOTS_HOST: ChatbotsHostConfig = {
  mode: "business",
  basePath: "/business/settings/chatbots",
  apiBase: "chatbots",
};

export const PLATFORM_CHATBOTS_HOST: ChatbotsHostConfig = {
  mode: "platform",
  basePath: "/platform/chatbots",
  apiBase: "platform/chatbots",
};

const ChatbotsHostContext =
  createContext<ChatbotsHostConfig>(BUSINESS_CHATBOTS_HOST);

export function ChatbotsHostProvider({
  value,
  children,
}: {
  value: ChatbotsHostConfig;
  children: ReactNode;
}) {
  return (
    <ChatbotsHostContext.Provider value={value}>
      {children}
    </ChatbotsHostContext.Provider>
  );
}

export function useChatbotsHost(): ChatbotsHostConfig {
  return useContext(ChatbotsHostContext);
}
