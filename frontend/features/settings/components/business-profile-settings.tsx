"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BusinessProfileFormFields } from "@/features/platform/components/business-profile-form-fields";
import { SettingsFormPage } from "@/components/layout/settings-page-layout";
import { SettingsInlineEditSection } from "@/components/layout/settings-inline-edit-section";
import { SettingsViewRows } from "@/components/layout/settings-view-rows";
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
  type BusinessProfileTab,
} from "@/features/settings/schemas/business-profile-tabs";
import { queryKeys } from "@/lib/query/keys";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import {
  getCurrentBusiness,
  updateCurrentBusiness,
} from "@/features/settings/api/business.api";
import { listActiveIndustries } from "@/features/platform/api/platform.api";
import { useSetPageMetadata } from "@/lib/runtime/page-metadata-context";
import { useSettingsSectionEdit } from "@/lib/settings/use-settings-section-edit";
import { SETTINGS_FORM_SECTION_STACK_CLASS } from "@/lib/design/settings-form-tokens";

function formatYesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

function profileSummaryRows(
  values: BusinessProfileFormValues,
  tab: BusinessProfileTab,
  industryName: string | null,
) {
  switch (tab) {
    case "contact":
      return [
        {
          label: "Name",
          value:
            values.displayName ||
            [values.firstName, values.lastName].filter(Boolean).join(" "),
        },
        { label: "Email", value: values.email },
        { label: "Phone", value: values.phone },
      ];
    case "business":
      return [
        { label: "Business name", value: values.name },
        { label: "Industry", value: industryName },
        { label: "Logo URL", value: values.logoUrl },
      ];
    case "address":
      return [
        { label: "Address", value: values.address },
        { label: "Address line 2", value: values.addressLine2 },
        { label: "City", value: values.city },
        { label: "State", value: values.state },
        { label: "Country", value: values.country },
        { label: "ZIP", value: values.zip },
      ];
    case "regional":
      return [
        { label: "Website", value: values.website },
        { label: "Timezone", value: values.timezone },
        {
          label: "Currency",
          value: values.taxesAndCurrency.currencyCode,
        },
        {
          label: "Default tax rate",
          value: `${values.taxesAndCurrency.defaultTaxRate}%`,
        },
        {
          label: "Prices include tax",
          value: formatYesNo(values.taxesAndCurrency.pricesIncludeTax),
        },
      ];
    default:
      return [];
  }
}

export function BusinessProfileSettings() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const setPageMetadata = useSetPageMetadata();
  const canEdit = useCan(PERMISSIONS["settings.business"]);
  const { editingSection, startEdit, stopEdit } =
    useSettingsSectionEdit<"profile">();

  const activeTab = parseBusinessProfileTab(searchParams.get("tab"));

  useEffect(() => {
    if (activeTab === "hours") {
      router.replace("/business/settings/business-hours");
    }
  }, [activeTab, router]);

  useEffect(() => {
    setPageMetadata(BUSINESS_PROFILE_TAB_META[activeTab]);
    stopEdit();
  }, [activeTab, setPageMetadata, stopEdit]);

  const { data: business, isLoading } = useQuery({
    queryKey: queryKeys.business.current(),
    queryFn: () => getCurrentBusiness(),
  });

  const { data: industries } = useQuery({
    queryKey: queryKeys.industries.active(),
    queryFn: () => listActiveIndustries(),
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
      stopEdit();
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

  const watched = form.watch();
  const industryName = useMemo(() => {
    const id = watched.industryId;
    return (
      industries?.find((item) => item.id === id)?.name ??
      business?.industry?.name ??
      null
    );
  }, [industries, watched.industryId, business?.industry?.name]);

  const summaryRows = useMemo(
    () => profileSummaryRows(watched, activeTab, industryName),
    [watched, activeTab, industryName],
  );

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  if (activeTab === "hours") {
    return <Skeleton className="h-48 w-full" />;
  }

  const meta = BUSINESS_PROFILE_TAB_META[activeTab];
  const isEditing = editingSection === "profile";

  return (
    <SettingsFormPage>
      <Form {...form}>
        <FormSchemaProvider schema={businessProfileSchema}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <SettingsFormStack>
              <div className={SETTINGS_FORM_SECTION_STACK_CLASS}>
                <SettingsInlineEditSection
                  title={meta.title}
                  description={meta.description}
                  summary={<SettingsViewRows rows={summaryRows} />}
                  isEditing={isEditing}
                  promoteEditToPageHeader
                  onEdit={() => startEdit("profile")}
                  onDiscard={() => {
                    form.reset(
                      business
                        ? businessToProfileForm(business)
                        : businessProfileDefaultValues,
                    );
                    stopEdit();
                  }}
                  onSave={() => void form.handleSubmit(onSubmit)()}
                  isDirty={form.formState.isDirty}
                  isSaving={mutation.isPending}
                  disabled={!canEdit}
                >
                  <BusinessProfileFormFields
                    form={form}
                    disabled={!canEdit}
                    activeTab={activeTab}
                    constrainScroll={false}
                    twoColumnLayout
                  />
                </SettingsInlineEditSection>
              </div>
              {!canEdit ? (
                <p className="text-sm text-muted-foreground">
                  Only owners, admins, and platform administrators can edit the
                  business profile.
                </p>
              ) : null}
            </SettingsFormStack>
          </form>
        </FormSchemaProvider>
      </Form>
    </SettingsFormPage>
  );
}
