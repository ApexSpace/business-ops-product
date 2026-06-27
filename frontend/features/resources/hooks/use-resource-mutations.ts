import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createResource,
  createResourceGroup,
  createResourceScheduleException,
  deleteResource,
  deleteResourceGroup,
  deleteResourceScheduleException,
  replaceResourceAvailability,
  updateResource,
  updateResourceGroup,
} from "@/features/resources/api/resources.api";
import {
  invalidateResourceGroups,
  invalidateResourceWorkspace,
  invalidateResources,
} from "@/lib/query/invalidation";
import type { ServiceResourceType } from "@/features/resources/types";

export function useResourceMutations() {
  const queryClient = useQueryClient();

  const createGroup = useMutation({
    mutationFn: (name: string) => createResourceGroup({ name }),
    onSuccess: () => {
      toast.success("Group created");
      void invalidateResourceGroups(queryClient);
    },
  });

  const updateGroup = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateResourceGroup(id, { name }),
    onSuccess: () => {
      toast.success("Group updated");
      void invalidateResourceGroups(queryClient);
    },
  });

  const removeGroup = useMutation({
    mutationFn: (id: string) => deleteResourceGroup(id),
    onSuccess: () => {
      toast.success("Group deleted");
      void invalidateResourceGroups(queryClient);
    },
  });

  const create = useMutation({
    mutationFn: (body: {
      name: string;
      resourceType: ServiceResourceType;
      groupId?: string | null;
    }) => createResource(body),
    onSuccess: () => {
      toast.success("Resource created");
      void invalidateResources(queryClient);
    },
  });

  const update = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Record<string, unknown>;
    }) => updateResource(id, body),
    onSuccess: (_, { id }) => {
      toast.success("Resource updated");
      void invalidateResourceWorkspace(queryClient, id);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteResource(id),
    onSuccess: () => {
      toast.success("Resource deleted");
      void invalidateResources(queryClient);
    },
  });

  const saveAvailability = useMutation({
    mutationFn: ({
      resourceId,
      slots,
    }: {
      resourceId: string;
      slots: Array<{
        dayOfWeek: string;
        startTime: string;
        endTime: string;
        isEnabled?: boolean;
      }>;
    }) => replaceResourceAvailability(resourceId, slots),
    onSuccess: (_, { resourceId }) => {
      toast.success("Schedule saved");
      void invalidateResourceWorkspace(queryClient, resourceId);
    },
  });

  const addScheduleException = useMutation({
    mutationFn: ({
      resourceId,
      body,
    }: {
      resourceId: string;
      body: {
        date: string;
        startTime?: string | null;
        endTime?: string | null;
        isUnavailable?: boolean;
        reason?: string | null;
      };
    }) => createResourceScheduleException(resourceId, body),
    onSuccess: (_, { resourceId }) => {
      toast.success("Exception added");
      void invalidateResourceWorkspace(queryClient, resourceId);
    },
  });

  const removeScheduleException = useMutation({
    mutationFn: ({
      resourceId,
      exceptionId,
    }: {
      resourceId: string;
      exceptionId: string;
    }) => deleteResourceScheduleException(resourceId, exceptionId),
    onSuccess: (_, { resourceId }) => {
      toast.success("Exception removed");
      void invalidateResourceWorkspace(queryClient, resourceId);
    },
  });

  return {
    createGroup,
    updateGroup,
    removeGroup,
    create,
    update,
    remove,
    saveAvailability,
    addScheduleException,
    removeScheduleException,
  };
}
