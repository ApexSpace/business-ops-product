"use client";

import { useState } from "react";
import { useContactDetail } from "@/features/contacts/hooks/use-contact-detail";

export type ConversationInboxContactSidebarState = ReturnType<
  typeof useConversationInboxContactSidebar
>;

export function useConversationInboxContactSidebar(contactId: string | null) {
  const [fullProfileOpen, setFullProfileOpen] = useState(false);

  const {
    data: contact,
    isLoading: contactLoading,
    isError: contactError,
  } = useContactDetail(contactId ?? "");

  return {
    contactId,
    contact,
    contactLoading,
    contactError,
    fullProfileOpen,
    setFullProfileOpen,
    onViewFullProfile: () => setFullProfileOpen(true),
  };
}
