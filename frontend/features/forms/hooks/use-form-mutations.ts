"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  archiveForm,
  createForm,
  deleteForm,
  duplicateForm,
  moveFormToDraft,
  publishForm,
  updateForm,
} from "@/features/forms/api/forms.api";
import type { FormDefinition } from "@/features/forms/types";
import {
  invalidateFormDetail,
  invalidateFormLists,
} from "@/lib/query/invalidation";

export function useFormMutations() {
  const queryClient = useQueryClient();

  const invalidateAll = async (id?: string) => {
    await invalidateFormLists(queryClient);
    if (id) {
      await invalidateFormDetail(queryClient, id);
    }
  };

  const createMutation = useMutation({
    mutationFn: (name: string) => createForm(name),
    onSuccess: async () => {
      await invalidateAll();
      toast.success("Form created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      name,
      definition,
    }: {
      id: string;
      name?: string;
      definition?: FormDefinition;
    }) => updateForm(id, { name, definition }),
    onSuccess: async (_, { id }) => {
      await invalidateAll(id);
      toast.success("Form saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteForm(id),
    onSuccess: async () => {
      await invalidateAll();
      toast.success("Form deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => duplicateForm(id),
    onSuccess: async () => {
      await invalidateAll();
      toast.success("Form duplicated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => publishForm(id),
    onSuccess: async (_, id) => {
      await invalidateAll(id);
      toast.success("Form published");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const draftMutation = useMutation({
    mutationFn: (id: string) => moveFormToDraft(id),
    onSuccess: async (_, id) => {
      await invalidateAll(id);
      toast.success("Form moved to draft");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => archiveForm(id),
    onSuccess: async (_, id) => {
      await invalidateAll(id);
      toast.success("Form archived");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    duplicateMutation,
    publishMutation,
    draftMutation,
    archiveMutation,
    isPending:
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending ||
      duplicateMutation.isPending ||
      publishMutation.isPending ||
      draftMutation.isPending ||
      archiveMutation.isPending,
  };
}
