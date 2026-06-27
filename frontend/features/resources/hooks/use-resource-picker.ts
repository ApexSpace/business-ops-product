import { useQuery } from "@tanstack/react-query";
import { listResourcePicker } from "@/features/resources/api/resources.api";
import { queryKeys } from "@/lib/query/keys";

export function useResourcePicker(search?: string) {
  return useQuery({
    queryKey: queryKeys.resources.picker(search),
    queryFn: () => listResourcePicker(search),
  });
}
