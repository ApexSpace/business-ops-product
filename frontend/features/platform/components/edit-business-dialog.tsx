"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FormDialog } from "@/components/forms/form-dialog";
import { BusinessProfileFormFields } from "@/features/platform/components/business-profile-form-fields";
import { updatePlatformBusiness } from "@/features/platform/api/platform.api";
import {
  businessProfileDefaultValues,
  businessProfileSchema,
  businessToProfileForm,
  profileFormToApiBody,
  type BusinessProfileFormValues,
} from "@/features/settings/schemas/business-profile";
import { invalidatePlatformBusinesses } from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import type { Business } from "@/features/platform/types";

interface EditBusinessDialogProps {
  business: Business | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditBusinessDialog({
  business,
  open,
  onOpenChange,
}: EditBusinessDialogProps) {
  const queryClient = useQueryClient();
  const form = useForm<BusinessProfileFormValues>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: businessProfileDefaultValues,
  });

  useEffect(() => {
    if (business && open) {
      form.reset(businessToProfileForm(business, { includeStatus: true }));
    }
  }, [business, form, open]);

  const mutation = useMutation({
    mutationFn: (values: BusinessProfileFormValues) =>
      updatePlatformBusiness(business!.id, profileFormToApiBody(values)),
    onSuccess: () => {
      toast.success("Business updated");
      void invalidatePlatformBusinesses(queryClient);
      if (business) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.platform.businesses.detail(business.id),
        });
      }
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit business"
      form={form}
      schema={businessProfileSchema}
      onSubmit={(v) => mutation.mutate(v)}
      isPending={mutation.isPending}
      submitLabel="Save changes"
      className="sm:max-w-2xl"
    >
      <BusinessProfileFormFields form={form} showStatus />
    </FormDialog>
  );
}
