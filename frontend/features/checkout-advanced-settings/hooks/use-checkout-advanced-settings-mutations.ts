"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  updateCheckoutAdvancedSettings,
  type UpdateCheckoutAdvancedSettingsBody,
} from "@/features/checkout-advanced-settings/api/checkout-advanced-settings.api";
import { invalidateCheckoutAdvancedSettings } from "@/lib/query/invalidation";

export function useCheckoutAdvancedSettingsMutations() {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (body: UpdateCheckoutAdvancedSettingsBody) =>
      updateCheckoutAdvancedSettings(body),
    onSuccess: async () => {
      await invalidateCheckoutAdvancedSettings(queryClient);
      toast.success("Advanced settings saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return { updateMutation };
}
