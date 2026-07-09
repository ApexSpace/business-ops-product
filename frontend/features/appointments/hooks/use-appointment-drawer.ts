"use client";

import { useCallback, useState } from "react";

import type { AppointmentServiceLineSelection } from "@/features/appointments/utils/appointment-service-lines";

export type DrawerMode =
  | "closed"
  | "detail"
  | "create"
  | "edit"
  | "conversation"
  | "timeBlock"
  | "checkout";

export interface AppointmentCreateDefaults {
  startAt: string;
  endAt?: string;
  assignedToId?: string;
  calendarId?: string;
  contactId?: string;
  contactLabel?: string;
  services?: AppointmentServiceLineSelection[];
  notes?: string;
}

export function useAppointmentDrawer() {
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("closed");
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [conversationContactId, setConversationContactId] = useState<
    string | null
  >(null);
  const [createDefaults, setCreateDefaults] =
    useState<AppointmentCreateDefaults | null>(null);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);

  const openDetail = useCallback((id: string) => {
    setAppointmentId(id);
    setConversationContactId(null);
    setCreateDefaults(null);
    setCheckoutId(null);
    setDrawerMode("detail");
  }, []);

  const openCreate = useCallback((defaults: AppointmentCreateDefaults) => {
    setAppointmentId(null);
    setConversationContactId(null);
    setCreateDefaults(defaults);
    setDrawerMode("create");
  }, []);

  const openTimeBlock = useCallback((defaults: AppointmentCreateDefaults) => {
    setAppointmentId(null);
    setConversationContactId(null);
    setCreateDefaults(defaults);
    setDrawerMode("timeBlock");
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
    setCheckoutId(null);
  }, []);

  const closeConversation = useCallback(() => {
    setConversationContactId(null);
    setDrawerMode(appointmentId ? "detail" : "closed");
  }, [appointmentId]);

  const openCheckout = useCallback((id: string) => {
    setCheckoutId(id);
    setDrawerMode("checkout");
  }, []);

  const closeCheckout = useCallback(() => {
    setCheckoutId(null);
    setDrawerMode(appointmentId ? "detail" : "closed");
  }, [appointmentId]);

  return {
    drawerMode,
    appointmentId,
    conversationContactId,
    createDefaults,
    checkoutId,
    openDetail,
    openCreate,
    openTimeBlock,
    openEdit,
    openConversation,
    openCheckout,
    closeCheckout,
    close,
    closeConversation,
  };
}
