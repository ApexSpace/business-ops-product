"use client";

import { useQuery } from "@tanstack/react-query";
import { getDefaultChatbot } from "@/features/chatbots/api/chatbots.api";
import { queryKeys } from "@/lib/query/keys";

export function useDefaultChatbot(apiBase = "chatbots") {
  return useQuery({
    queryKey: queryKeys.chatbots.default(apiBase),
    queryFn: () => getDefaultChatbot(apiBase),
  });
}
