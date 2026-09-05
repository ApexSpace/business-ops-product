"use client";

import {
  updateOnlineBookingPreferences,
  updateOnlineBookingSetup,
  updateOnlineBookingStaffSelection,
  type OnlineBookingSettings,
} from "@/features/online-booking-settings/api/online-booking-settings.api";
import { invalidateOnlineBookingSettings } from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import { useOptimisticQueryPatchMutation } from "@/lib/query/use-optimistic-query-patch-mutation";

function useOnlineBookingPatchMutation(
  mutationFn: (
    body: Record<string, unknown>,
  ) => Promise<OnlineBookingSettings>,
  successMessage: string,
) {
  return useOptimisticQueryPatchMutation<
    OnlineBookingSettings,
    Record<string, unknown>
  >({
    queryKey: queryKeys.onlineBookingSettings.detail(),
    mutationFn,
    applyOptimistic: (previous, body) => ({
      ...previous,
      ...(body as Partial<OnlineBookingSettings>),
    }),
    successMessage,
    invalidate: (qc) => invalidateOnlineBookingSettings(qc),
  });
}

export function useOnlineBookingSettingsMutations() {
  const setupMutation = useOnlineBookingPatchMutation(
    updateOnlineBookingSetup,
    "Setup saved",
  );

  const preferencesMutation = useOnlineBookingPatchMutation(
    updateOnlineBookingPreferences,
    "Preferences saved",
  );

  const staffSelectionMutation = useOnlineBookingPatchMutation(
    updateOnlineBookingStaffSelection,
    "Staff selection saved",
  );

  return {
    setupMutation,
    preferencesMutation,
    staffSelectionMutation,
    isSaving:
      setupMutation.isPending ||
      preferencesMutation.isPending ||
      staffSelectionMutation.isPending,
  };
}
