import { useQuery } from "@tanstack/react-query";
import { listResources } from "@/features/resources/api/resources.api";
import { queryKeys } from "@/lib/query/keys";
import type { ServiceResourceType } from "@/features/resources/types";

export function useResourcesList(filters?: {
  groupId?: string;
  resourceType?: ServiceResourceType;
  search?: string;
}) {
  return useQuery({
    queryKey: queryKeys.resources.list(filters ?? {}),
    queryFn: () => listResources(filters),
  });
}
