"use client";

import { useCallback, useState } from "react";

export type DrawerMode = "closed" | "detail" | "create" | "edit" | "conversation";

export interface AppointmentCreateDefaults {
  startAt: string;
  endAt: string;
  assignedToId?: string;
  calendarId?: string;
}

export function useAppointmentDrawer() {
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("closed");
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [conversationContactId, setConversationContactId] = useState<
    string | null
  >(null);
  const [createDefaults, setCreateDefaults] =
    useState<AppointmentCreateDefaults | null>(null);

  const openDetail = useCallback((id: string) => {
    setAppointmentId(id);
    setConversationContactId(null);
    setCreateDefaults(null);
    setDrawerMode("detail");
  }, []);

  const openCreate = useCallback((defaults: AppointmentCreateDefaults) => {
    setAppointmentId(null);
    setConversationContactId(null);
    setCreateDefaults(defaults);
    setDrawerMode("create");
  }, []);

  const openEdit = useCallback(() => {
    setConversationContactId(null);
    setDrawerMode("edit");
  }, []);

  const openConversation = useCallback((contactId: string) => {
    setConversationContactId(contactId);
    setDrawerMode("conversation");
  }, []);

  const close = useCallback(() => {
    setDrawerMode("closed");
    setAppointmentId(null);
    setConversationContactId(null);
    setCreateDefaults(null);
  }, []);

  const closeConversation = useCallback(() => {
    setConversationContactId(null);
    setDrawerMode(appointmentId ? "detail" : "closed");
  }, [appointmentId]);

  return {
    drawerMode,
    appointmentId,
    conversationContactId,
    createDefaults,
    openDetail,
    openCreate,
    openEdit,
    openConversation,
    close,
    closeConversation,
  };
}
