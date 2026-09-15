import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CalendarDisplaySettings } from "@/features/calendar-display-settings/api/calendar-display-settings.api";
import { invalidateCalendarDisplaySettings } from "@/lib/query/invalidation";

export function useCalendarDisplaySettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      action: () => Promise<CalendarDisplaySettings>,
    ) => action(),
    onSuccess: async () => {
      await invalidateCalendarDisplaySettings(queryClient);
      toast.success("Display preferences saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
