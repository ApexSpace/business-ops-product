"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  updateOnlineBookingPreferences,
  updateOnlineBookingSetup,
  updateOnlineBookingStaffSelection,
} from "@/features/online-booking-settings/api/online-booking-settings.api";
import { invalidateOnlineBookingSettings } from "@/lib/query/invalidation";

export function useOnlineBookingSettingsMutations() {
  const queryClient = useQueryClient();

  const onSuccess = async (message: string) => {
    await invalidateOnlineBookingSettings(queryClient);
    toast.success(message);
  };

  const setupMutation = useMutation({
    mutationFn: updateOnlineBookingSetup,
    onSuccess: () => onSuccess("Setup saved"),
    onError: (err: Error) => toast.error(err.message),
  });

  const preferencesMutation = useMutation({
    mutationFn: updateOnlineBookingPreferences,
    onSuccess: () => onSuccess("Preferences saved"),
    onError: (err: Error) => toast.error(err.message),
  });

  const staffSelectionMutation = useMutation({
    mutationFn: updateOnlineBookingStaffSelection,
    onSuccess: () => onSuccess("Staff selection saved"),
    onError: (err: Error) => toast.error(err.message),
  });

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
