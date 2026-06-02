"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BusinessProfileFormFields } from "@/components/platform/business-profile-form-fields";
import { FormActions } from "@/components/layout/form-actions";
import { PageHeader } from "@/components/layout/page-header";
import { PageTabs, PageTabsPanel } from "@/components/layout/page-tabs";
import { Button } from "@/components/ui/button";
import { Form, FormSchemaProvider } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api-client";
import {
  businessProfileDefaultValues,
  businessProfileSchema,
  businessToProfileForm,
  profileFormToApiBody,
  type BusinessProfileFormValues,
} from "@/lib/business-profile";
import {
  BUSINESS_PROFILE_TABS,
  parseBusinessProfileTab,
  type BusinessProfileTab,
} from "@/lib/business-profile-tabs";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/lib/auth-provider";
import { canManageBusinessSettings } from "@/lib/permissions";
import type { Business } from "@/types/api";

export function BusinessProfileSettings() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { jwt, contexts } = useAuth();
  const queryClient = useQueryClient();
  const canEdit = canManageBusinessSettings(jwt, contexts);

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
    queryFn: () => apiClient<Business>("businesses/current"),
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
      apiClient<Business>("businesses/current", {
        method: "PATCH",
        body: profileFormToApiBody(values),
      }),
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

  return (
    <div className="w-full min-w-0 space-y-6">
      <PageHeader />

      <Form {...form}>
        <FormSchemaProvider schema={businessProfileSchema}>
          <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="w-full min-w-0 space-y-6"
          >
          <PageTabs
            value={activeTab}
            onValueChange={(v) =>
              setActiveTab(parseBusinessProfileTab(v))
            }
            tabs={[...BUSINESS_PROFILE_TABS]}
            className="w-full"
          >
            {BUSINESS_PROFILE_TABS.map((tab) => (
              <PageTabsPanel key={tab.value} value={tab.value}>
                <BusinessProfileFormFields
                  form={form}
                  disabled={!canEdit}
                  activeTab={tab.value}
                  constrainScroll={false}
                />
              </PageTabsPanel>
            ))}
          </PageTabs>

          {canEdit ? (
            <FormActions>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : "Save changes"}
              </Button>
            </FormActions>
          ) : (
            <p className="text-sm text-muted-foreground">
              Only owners, admins, and platform administrators can edit the
              business profile.
            </p>
          )}
          </form>
        </FormSchemaProvider>
      </Form>
    </div>
  );
}
