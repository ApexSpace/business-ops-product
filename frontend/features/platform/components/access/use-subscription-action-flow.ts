"use client";

import { useCallback, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { previewPlatformBusinessAccessAction } from "@/features/platform/api/business-access.api";
import type {
  PreviewActionResult,
  SubscriptionActionDefinition,
  SubscriptionActionKey,
} from "@/features/platform/types/business-subscription";
import {
  executeSubscriptionAction,
  type SubscriptionActionPayload,
} from "@/features/platform/utils/subscription-action-executor";

export function useSubscriptionActionFlow({
  businessId,
  onSuccess,
}: {
  businessId: string;
  onSuccess: () => void;
}) {
  const [preview, setPreview] = useState<PreviewActionResult | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pendingAction, setPendingAction] =
    useState<SubscriptionActionDefinition | null>(null);
  const [pendingPayload, setPendingPayload] = useState<
    SubscriptionActionPayload | undefined
  >(undefined);

  const previewMutation = useMutation({
    mutationFn: ({
      actionKey,
      input,
    }: {
      actionKey: SubscriptionActionKey;
      input?: Record<string, unknown>;
      action?: SubscriptionActionDefinition;
      payload?: SubscriptionActionPayload;
    }) =>
      previewPlatformBusinessAccessAction(businessId, { actionKey, input }),
    onSuccess: (result, variables) => {
      setPreview(result);
      setPendingAction(
        variables.action ?? {
          key: variables.actionKey,
          label: variables.actionKey,
          category: "billing",
          visible: true,
          enabled: true,
          severity: "safe",
          requiresConfirmation: result.requiresConfirmation,
          requiresInput: false,
        },
      );
      setPendingPayload(variables.payload);
      setPreviewOpen(true);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const executeMutation = useMutation({
    mutationFn: () => {
      if (!pendingAction) throw new Error("No pending action");
      return executeSubscriptionAction(
        businessId,
        pendingAction.key,
        pendingPayload,
      );
    },
    onSuccess: () => {
      toast.success("Action applied");
      setPreviewOpen(false);
      setPreview(null);
      setPendingAction(null);
      setPendingPayload(undefined);
      onSuccess();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const startPreview = useCallback(
    (
      action: SubscriptionActionDefinition,
      input?: Record<string, unknown>,
      payload?: SubscriptionActionPayload,
    ) => {
      previewMutation.mutate({
        actionKey: action.key,
        input,
        action,
        payload,
      });
    },
    [previewMutation],
  );

  const confirmAction = useCallback(() => {
    executeMutation.mutate();
  }, [executeMutation]);

  const openPreview = useCallback(
    (
      result: PreviewActionResult,
      action: SubscriptionActionDefinition,
      payload?: SubscriptionActionPayload,
    ) => {
      setPreview(result);
      setPendingAction(action);
      setPendingPayload(payload);
      setPreviewOpen(true);
    },
    [],
  );

  return {
    preview,
    previewOpen,
    setPreviewOpen,
    pendingAction,
    isPreviewing: previewMutation.isPending,
    isExecuting: executeMutation.isPending,
    startPreview,
    openPreview,
    confirmAction,
  };
}
