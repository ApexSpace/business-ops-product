import { useQuery } from "@tanstack/react-query";
import { getResourceWorkspace } from "@/features/resources/api/resources.api";
import { queryKeys } from "@/lib/query/keys";

export function useResourceWorkspace(resourceId: string | null) {
  return useQuery({
    queryKey: queryKeys.resources.workspace(resourceId ?? ""),
    queryFn: () => getResourceWorkspace(resourceId!),
    enabled: Boolean(resourceId),
  });
}
