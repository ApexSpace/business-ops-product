"use client";

import { createContext, useContext, type ReactNode } from "react";

export type ConversationsHostMode = "business" | "platform";

export type ConversationsHostConfig = {
  mode: ConversationsHostMode;
  /** UI route prefix */
  basePath: string;
  /** Conversations API path prefix */
  apiBase: string;
  /** Contact conversation API path prefix */
  contactsApiBase: string;
  /** Canned responses API path prefix */
  cannedApiBase: string;
};

export const BUSINESS_CONVERSATIONS_HOST: ConversationsHostConfig = {
  mode: "business",
  basePath: "/business/conversations",
  apiBase: "conversations",
  contactsApiBase: "contacts",
  cannedApiBase: "canned-responses",
};

export const PLATFORM_CONVERSATIONS_HOST: ConversationsHostConfig = {
  mode: "platform",
  basePath: "/platform/conversations",
  apiBase: "platform/conversations",
  contactsApiBase: "platform/contacts",
  cannedApiBase: "platform/canned-responses",
};

const ConversationsHostContext = createContext<ConversationsHostConfig>(
  BUSINESS_CONVERSATIONS_HOST,
);

export function ConversationsHostProvider({
  value,
  children,
}: {
  value: ConversationsHostConfig;
  children: ReactNode;
}) {
  return (
    <ConversationsHostContext.Provider value={value}>
      {children}
    </ConversationsHostContext.Provider>
  );
}

export function useConversationsHost(): ConversationsHostConfig {
  return useContext(ConversationsHostContext);
}
