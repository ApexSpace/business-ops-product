"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createServiceCategory,
  deleteServiceCategory,
  reorderServiceCategories,
  updateServiceCategory,
} from "@/features/services/api/service-categories.api";
import {
  invalidateServiceCategories,
  invalidateServiceLists,
} from "@/lib/query/invalidation";
import {
  createService,
  deleteService,
  reorderServices,
} from "@/features/settings/api/services.api";

export function useServiceCatalogMutations() {
  const queryClient = useQueryClient();

  const invalidateTree = () => {
    void invalidateServiceCategories(queryClient);
    void invalidateServiceLists(queryClient);
  };

  const createCategory = useMutation({
    mutationFn: (body: { name: string; description?: string }) =>
      createServiceCategory(body),
    onSuccess: () => {
      toast.success("Category created");
      invalidateTree();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateCategory = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Record<string, unknown>;
    }) => updateServiceCategory(id, body),
    onSuccess: () => {
      toast.success("Category updated");
      invalidateTree();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeCategory = useMutation({
    mutationFn: (id: string) => deleteServiceCategory(id),
    onSuccess: () => {
      toast.success("Category deleted");
      invalidateTree();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reorderCategories = useMutation({
    mutationFn: (orderedIds: string[]) => reorderServiceCategories(orderedIds),
    onSuccess: () => {
      invalidateTree();
    },
    onError: (err: Error) => {
      toast.error(err.message);
      invalidateTree();
    },
  });

  const createServiceMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => createService(body),
    onSuccess: () => {
      toast.success("Service created");
      invalidateTree();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeService = useMutation({
    mutationFn: (id: string) => deleteService(id),
    onSuccess: () => {
      toast.success("Service deleted");
      invalidateTree();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reorderServicesMutation = useMutation({
    mutationFn: ({
      categoryId,
      orderedIds,
    }: {
      categoryId: string;
      orderedIds: string[];
    }) => reorderServices(categoryId, orderedIds),
    onSuccess: () => {
      invalidateTree();
    },
    onError: (err: Error) => {
      toast.error(err.message);
      invalidateTree();
    },
  });

  return {
    createCategory,
    updateCategory,
    removeCategory,
    reorderCategories,
    createService: createServiceMutation,
    removeService,
    reorderServices: reorderServicesMutation,
  };
}
