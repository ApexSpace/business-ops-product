import { useQuery } from "@tanstack/react-query";
import { getExpressBookingSettings } from "@/features/express-booking/api/express-booking-settings.api";
import { queryKeys } from "@/lib/query/keys";

export function useExpressBookingSettings(enabled = true) {
  return useQuery({
    queryKey: queryKeys.onlineBookingSettings.detail(),
    queryFn: getExpressBookingSettings,
    enabled,
  });
}
