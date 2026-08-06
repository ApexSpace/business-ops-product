"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  cancelSocialPost,
  createSocialPost,
  deleteSocialPost,
  publishSocialPostNow,
  retrySocialPostTarget,
  scheduleSocialPost,
  updateSocialPost,
  validateSocialPost,
} from "@/features/social-planner/api/social-planner.api";
import type { CreateSocialPostInput } from "@/features/social-planner/types";
import { invalidateSocialPlanner } from "@/lib/query/invalidation";

export function useSocialPostMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => invalidateSocialPlanner(queryClient);

  const create = useMutation({
    mutationFn: (body: CreateSocialPostInput) => createSocialPost(body),
    onSuccess: async () => {
      toast.success("Draft saved");
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message || "Save failed"),
  });

  const update = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Partial<CreateSocialPostInput>;
    }) => updateSocialPost(id, body),
    onSuccess: async () => {
      toast.success("Post updated");
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message || "Update failed"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteSocialPost(id),
    onSuccess: async () => {
      toast.success("Post deleted");
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message || "Delete failed"),
  });

  const validate = useMutation({
    mutationFn: (body: CreateSocialPostInput) => validateSocialPost(body),
  });

  const schedule = useMutation({
    mutationFn: ({
      id,
      scheduledAt,
      timezone,
    }: {
      id: string;
      scheduledAt: string;
      timezone?: string;
    }) => scheduleSocialPost(id, { scheduledAt, timezone }),
    onSuccess: async () => {
      toast.success("Post scheduled");
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message || "Schedule failed"),
  });

  const publishNow = useMutation({
    mutationFn: (id: string) => publishSocialPostNow(id),
    onSuccess: async () => {
      toast.success("Publishing started");
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message || "Publish failed"),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => cancelSocialPost(id),
    onSuccess: async () => {
      toast.success("Post cancelled");
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message || "Cancel failed"),
  });

  const retryTarget = useMutation({
    mutationFn: (targetId: string) => retrySocialPostTarget(targetId),
    onSuccess: async () => {
      toast.success("Retry queued");
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message || "Retry failed"),
  });

  return {
    create,
    update,
    remove,
    validate,
    schedule,
    publishNow,
    cancel,
    retryTarget,
  };
}
