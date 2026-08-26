"use client";

import { useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BusinessProfileFormFields } from "@/features/platform/components/business-profile-form-fields";
import { SettingsFormActions } from "@/components/layout/settings-form-actions";
import { SettingsFormStack } from "@/components/forms/settings-form-grid";
import { Form, FormSchemaProvider } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import {
  businessProfileDefaultValues,
  businessProfileSchema,
  businessToProfileForm,
  profileFormToApiBody,
  type BusinessProfileFormValues,
} from "@/features/settings/schemas/business-profile";
import {
  BUSINESS_PROFILE_TAB_META,
  parseBusinessProfileTab,
} from "@/features/settings/schemas/business-profile-tabs";
import { queryKeys } from "@/lib/query/keys";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import { BusinessHoursSettingsPanel } from "@/features/settings/components/business-hours-settings-panel";
import {
  getCurrentBusiness,
  updateCurrentBusiness,
} from "@/features/settings/api/business.api";
import { useSetPageMetadata } from "@/lib/runtime/page-metadata-context";

export function BusinessProfileSettings() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const setPageMetadata = useSetPageMetadata();
  const canEdit = useCan(PERMISSIONS["settings.business"]);

  const activeTab = parseBusinessProfileTab(searchParams.get("tab"));

  useEffect(() => {
    setPageMetadata(BUSINESS_PROFILE_TAB_META[activeTab]);
  }, [activeTab, setPageMetadata]);

  const { data: business, isLoading } = useQuery({
    queryKey: queryKeys.business.current(),
    queryFn: () => getCurrentBusiness(),
  });

  const form = useForm<BusinessProfileFormValues>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: businessProfileDefaultValues,
  });

  useEffect(() => {
    if (business) {
      form.reset(businessToProfileForm(business));
    }
  }, [business, form]);

  const mutation = useMutation({
    mutationFn: (values: BusinessProfileFormValues) =>
      updateCurrentBusiness(profileFormToApiBody(values)),
    onSuccess: () => {
      toast.success("Profile saved");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.business.current(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.business.financialSettings(),
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const onSubmit = useCallback(
    (values: BusinessProfileFormValues) => mutation.mutate(values),
    [mutation],
  );

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  if (activeTab === "hours") {
    return <BusinessHoursSettingsPanel disabled={!canEdit} embedded />;
  }

  const permissionMessage = (
    <p className="text-sm text-muted-foreground">
      Only owners, admins, and platform administrators can edit the business
      profile.
    </p>
  );

  return (
    <Form {...form}>
      <FormSchemaProvider schema={businessProfileSchema}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <SettingsFormStack>
            <BusinessProfileFormFields
              form={form}
              disabled={!canEdit}
              activeTab={activeTab}
              constrainScroll={false}
              twoColumnLayout
            />
            {canEdit ? (
              <SettingsFormActions
                onDiscard={() => form.reset()}
                isDirty={form.formState.isDirty}
                isSubmitting={mutation.isPending}
              />
            ) : (
              permissionMessage
            )}
          </SettingsFormStack>
        </form>
      </FormSchemaProvider>
    </Form>
  );
}
