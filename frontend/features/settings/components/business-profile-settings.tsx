"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BusinessProfileFormFields } from "@/features/platform/components/business-profile-form-fields";
import { SettingsFormActions } from "@/components/layout/settings-form-actions";
import { PageHeader } from "@/components/layout/page-header";
import { PageTabs, PageTabsPanel } from "@/components/layout/page-tabs";
import { SettingsCard } from "@/components/layout/settings-card";
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
  BUSINESS_PROFILE_TABS,
  parseBusinessProfileTab,
  type BusinessProfileTab,
} from "@/features/settings/schemas/business-profile-tabs";
import { queryKeys } from "@/lib/query/keys";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import { BusinessHoursSettingsPanel } from "@/features/settings/components/business-hours-settings-panel";
import {
  getCurrentBusiness,
  updateCurrentBusiness,
} from "@/features/settings/api/business.api";

const PROFILE_TAB_CARDS: Record<
  BusinessProfileTab,
  { title: string; description: string }
> = {
  contact: {
    title: "Primary contact",
    description:
      "Contact person details used across invoices, booking, and notifications.",
  },
  business: {
    title: "Business details",
    description: "Legal name, industry, and branding for this workspace.",
  },
  address: {
    title: "Business address",
    description:
      "Physical address shown on invoices, estimates, and public pages.",
  },
  regional: {
    title: "Regional & tax",
    description: "Website, timezone, currency, and default tax settings.",
  },
  hours: {
    title: "Business hours",
    description:
      "Weekly hours for online booking. Staff can override these from team settings.",
  },
};

export function BusinessProfileSettings() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const canEdit = useCan(PERMISSIONS["settings.business"]);

  const activeTab = parseBusinessProfileTab(searchParams.get("tab"));

  const setActiveTab = useCallback(
    (tab: BusinessProfileTab) => {
      const next = new URLSearchParams(searchParams.toString());
      if (tab === "contact") next.delete("tab");
      else next.set("tab", tab);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

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

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  const profileSaveFooter = canEdit ? (
    <SettingsFormActions
      onDiscard={() => form.reset()}
      isDirty={form.formState.isDirty}
      isSubmitting={mutation.isPending}
    />
  ) : (
    <p className="text-sm text-muted-foreground">
      Only owners, admins, and platform administrators can edit the business
      profile.
    </p>
  );

  return (
    <div className="w-full min-w-0 space-y-6">
      <PageHeader />

      <Form {...form}>
        <FormSchemaProvider schema={businessProfileSchema}>
          <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="w-full min-w-0 max-w-3xl space-y-5"
          >
            <PageTabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(parseBusinessProfileTab(v))}
              tabs={[...BUSINESS_PROFILE_TABS]}
              className="w-full"
            >
              {BUSINESS_PROFILE_TABS.map((tab) => {
                const card = PROFILE_TAB_CARDS[tab.value];
                return (
                  <PageTabsPanel
                    key={tab.value}
                    value={tab.value}
                    className="mt-5"
                  >
                    <SettingsCard
                      title={card.title}
                      description={card.description}
                      footer={
                        tab.value === "hours" ? undefined : profileSaveFooter
                      }
                    >
                      {tab.value === "hours" ? (
                        <BusinessHoursSettingsPanel
                          disabled={!canEdit}
                          embedded
                        />
                      ) : (
                        <BusinessProfileFormFields
                          form={form}
                          disabled={!canEdit}
                          activeTab={tab.value}
                          constrainScroll={false}
                          twoColumnLayout
                        />
                      )}
                    </SettingsCard>
                  </PageTabsPanel>
                );
              })}
            </PageTabs>
          </form>
        </FormSchemaProvider>
      </Form>
    </div>
  );
}
