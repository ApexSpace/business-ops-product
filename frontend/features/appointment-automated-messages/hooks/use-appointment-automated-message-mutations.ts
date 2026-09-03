"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createAppointmentAutomatedMessage,
  createAppointmentAutomatedMessageTrigger,
  deleteAppointmentAutomatedMessage,
  deleteAppointmentAutomatedMessageTrigger,
  updateAppointmentAutomatedMessage,
  updateAppointmentAutomatedMessageSettings,
  updateAppointmentAutomatedMessageTrigger,
  type AppointmentAutomatedMessageEventType,
  type AppointmentAutomatedMessageOffsetUnit,
  type AppointmentAutomatedMessageSourceScope,
  type AppointmentAutomatedMessageTriggerKind,
  type NotificationChannel,
} from "@/features/appointment-automated-messages/api/appointment-automated-messages.api";
import { invalidateAppointmentAutomatedMessages } from "@/lib/query/invalidation";

export function useAppointmentAutomatedMessageMutations(
  eventType: AppointmentAutomatedMessageEventType,
) {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await invalidateAppointmentAutomatedMessages(queryClient, eventType);
  };

  const updateSettingsMutation = useMutation({
    mutationFn: (body: { defaultStatus?: "UNCONFIRMED" | "CONFIRMED" }) =>
      updateAppointmentAutomatedMessageSettings(eventType, body),
    onSuccess: async () => {
      await invalidate();
      toast.success("Settings saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createTriggerMutation = useMutation({
    mutationFn: (body: {
      kind: AppointmentAutomatedMessageTriggerKind;
      offsetValue?: number;
      offsetUnit?: AppointmentAutomatedMessageOffsetUnit;
      sortOrder?: number;
    }) => createAppointmentAutomatedMessageTrigger(eventType, body),
    onSuccess: async () => {
      await invalidate();
      toast.success("Reminder added");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateTriggerMutation = useMutation({
    mutationFn: ({
      triggerId,
      body,
    }: {
      triggerId: string;
      body: {
        offsetValue?: number;
        offsetUnit?: AppointmentAutomatedMessageOffsetUnit;
        sortOrder?: number;
      };
    }) => updateAppointmentAutomatedMessageTrigger(triggerId, body),
    onSuccess: async () => {
      await invalidate();
      toast.success("Timing updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteTriggerMutation = useMutation({
    mutationFn: (triggerId: string) =>
      deleteAppointmentAutomatedMessageTrigger(triggerId),
    onSuccess: async () => {
      await invalidate();
      toast.success("Reminder removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createMessageMutation = useMutation({
    mutationFn: ({
      triggerId,
      body,
    }: {
      triggerId: string;
      body: {
        sourceScope: AppointmentAutomatedMessageSourceScope;
        channel: NotificationChannel;
        notificationKey: string;
        enabled?: boolean;
      };
    }) => createAppointmentAutomatedMessage(triggerId, body),
    onSuccess: async () => {
      await invalidate();
      toast.success("Message added");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMessageMutation = useMutation({
    mutationFn: ({
      messageId,
      body,
    }: {
      messageId: string;
      body: Partial<{
        sourceScope: AppointmentAutomatedMessageSourceScope;
        channel: NotificationChannel;
        notificationKey: string;
        enabled: boolean;
      }>;
    }) => updateAppointmentAutomatedMessage(messageId, body),
    onSuccess: async () => {
      await invalidate();
      toast.success("Message updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMessageMutation = useMutation({
    mutationFn: (messageId: string) =>
      deleteAppointmentAutomatedMessage(messageId),
    onSuccess: async () => {
      await invalidate();
      toast.success("Message removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    updateSettingsMutation,
    createTriggerMutation,
    updateTriggerMutation,
    deleteTriggerMutation,
    createMessageMutation,
    updateMessageMutation,
    deleteMessageMutation,
  };
}
