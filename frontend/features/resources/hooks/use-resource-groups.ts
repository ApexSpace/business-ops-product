import { useQuery } from "@tanstack/react-query";
import { listResourceGroups } from "@/features/resources/api/resources.api";
import { queryKeys } from "@/lib/query/keys";

export function useResourceGroups() {
  return useQuery({
    queryKey: queryKeys.resources.groups(),
    queryFn: listResourceGroups,
  });
}
