"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { Form, FormSchemaProvider } from "@/components/ui/form";
import type { Business } from "@/features/platform/types";

export function PlatformBusinessProfileTab({
  business,
  canUpdate,
}: {
  business: Business;
  canUpdate: boolean;
}) {
  const queryClient = useQueryClient();
  const form = useForm<BusinessProfileFormValues>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: businessProfileDefaultValues,
  });

  useEffect(() => {
    form.reset(businessToProfileForm(business, { includeStatus: true }));
  }, [business, form]);

  const mutation = useMutation({
    mutationFn: (values: BusinessProfileFormValues) =>
      updatePlatformBusiness(business.id, profileFormToApiBody(values)),
    onSuccess: () => {
      toast.success("Business updated");
      void invalidatePlatformBusinesses(queryClient);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.platform.businesses.detail(business.id),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.platform.businesses.utilization(business.id),
      });
      form.reset(form.getValues());
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const isDirty = form.formState.isDirty;

  return (
    <Form {...form}>
      <FormSchemaProvider schema={businessProfileSchema}>
        <form
          className="space-y-6"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <BusinessProfileFormFields
            form={form}
            disabled={!canUpdate || mutation.isPending}
            showStatus
            showSnapshotPicker={false}
            constrainScroll={false}
            twoColumnLayout
          />

          {canUpdate ? (
            <div className="sticky bottom-0 z-10 -mx-1 flex items-center justify-end gap-2 border-t bg-background/95 px-1 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <Button
                type="submit"
                disabled={!isDirty || mutation.isPending}
              >
                {mutation.isPending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          ) : null}
        </form>
      </FormSchemaProvider>
    </Form>
  );
}
