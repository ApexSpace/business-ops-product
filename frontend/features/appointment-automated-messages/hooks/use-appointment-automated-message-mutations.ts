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
  type AppointmentAutomatedMessage,
  type AppointmentAutomatedMessageEventType,
  type AppointmentAutomatedMessageOffsetUnit,
  type AppointmentAutomatedMessageSettings,
  type AppointmentAutomatedMessageSourceScope,
  type AppointmentAutomatedMessageTriggerKind,
  type NotificationChannel,
} from "@/features/appointment-automated-messages/api/appointment-automated-messages.api";
import { invalidateAppointmentAutomatedMessages } from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import { useOptimisticQueryPatchMutation } from "@/lib/query/use-optimistic-query-patch-mutation";

function patchMessageInSettings(
  settings: AppointmentAutomatedMessageSettings,
  messageId: string,
  patch: Partial<AppointmentAutomatedMessage>,
): AppointmentAutomatedMessageSettings {
  return {
    ...settings,
    triggers: settings.triggers.map((trigger) => ({
      ...trigger,
      messages: trigger.messages.map((message) =>
        message.id === messageId ? { ...message, ...patch } : message,
      ),
    })),
  };
}

function upsertMessageInSettings(
  settings: AppointmentAutomatedMessageSettings,
  message: AppointmentAutomatedMessage,
): AppointmentAutomatedMessageSettings {
  return {
    ...settings,
    triggers: settings.triggers.map((trigger) => ({
      ...trigger,
      messages: trigger.messages.some((item) => item.id === message.id)
        ? trigger.messages.map((item) =>
            item.id === message.id ? message : item,
          )
        : trigger.messages,
    })),
  };
}

export function useAppointmentAutomatedMessageMutations(
  eventType: AppointmentAutomatedMessageEventType,
) {
  const queryClient = useQueryClient();
  const detailKey = queryKeys.appointmentAutomatedMessages.detail(eventType);

  const invalidate = () =>
    invalidateAppointmentAutomatedMessages(queryClient, eventType);

  const updateSettingsMutation = useOptimisticQueryPatchMutation<
    AppointmentAutomatedMessageSettings,
    { defaultStatus?: "UNCONFIRMED" | "CONFIRMED" }
  >({
    queryKey: detailKey,
    mutationFn: (body) =>
      updateAppointmentAutomatedMessageSettings(eventType, body),
    applyOptimistic: (previous, body) => ({
      ...previous,
      ...body,
    }),
    successMessage: "Settings saved",
    invalidate: (qc) =>
      invalidateAppointmentAutomatedMessages(qc, eventType),
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

  const updateMessageMutation = useOptimisticQueryPatchMutation<
    AppointmentAutomatedMessageSettings,
    {
      messageId: string;
      body: Partial<{
        sourceScope: AppointmentAutomatedMessageSourceScope;
        channel: NotificationChannel;
        notificationKey: string;
        enabled: boolean;
      }>;
    },
    AppointmentAutomatedMessage
  >({
    queryKey: detailKey,
    mutationFn: ({ messageId, body }) =>
      updateAppointmentAutomatedMessage(messageId, body),
    applyOptimistic: (previous, { messageId, body }) =>
      patchMessageInSettings(previous, messageId, body),
    resolveData: (previous, result) =>
      previous ? upsertMessageInSettings(previous, result) : undefined,
    successMessage: "Message updated",
    invalidate: (qc) =>
      invalidateAppointmentAutomatedMessages(qc, eventType),
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
