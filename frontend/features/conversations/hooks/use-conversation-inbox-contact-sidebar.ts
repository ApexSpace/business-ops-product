"use client";

import { useState } from "react";
import { useContactDetail } from "@/features/contacts/hooks/use-contact-detail";
import { useConversationsHost } from "@/features/conversations/conversations-host-context";

export type ConversationInboxContactSidebarState = ReturnType<
  typeof useConversationInboxContactSidebar
>;

export function useConversationInboxContactSidebar(contactId: string | null) {
  const { mode } = useConversationsHost();
  const [fullProfileOpen, setFullProfileOpen] = useState(false);
  const isPlatform = mode === "platform";

  const {
    data: contact,
    isLoading: contactLoading,
    isError: contactError,
  } = useContactDetail(isPlatform ? "" : (contactId ?? ""));

  return {
    contactId,
    contact: isPlatform ? undefined : contact,
    contactLoading: isPlatform ? false : contactLoading,
    contactError: isPlatform ? false : contactError,
    fullProfileOpen,
    setFullProfileOpen,
    onViewFullProfile: () => setFullProfileOpen(true),
  };
}
