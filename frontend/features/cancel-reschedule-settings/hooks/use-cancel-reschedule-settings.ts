import { useQuery } from "@tanstack/react-query";
import { getCancelRescheduleSettings } from "@/features/cancel-reschedule-settings/api/cancel-reschedule-settings.api";
import { queryKeys } from "@/lib/query/keys";

export function useCancelRescheduleSettings() {
  return useQuery({
    queryKey: queryKeys.cancelRescheduleSettings.detail(),
    queryFn: getCancelRescheduleSettings,
  });
}
