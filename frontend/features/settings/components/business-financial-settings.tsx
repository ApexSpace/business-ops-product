"use client";

import { FormActions } from "@/components/layout/form-actions";
import { PageHeader } from "@/components/layout/page-header";
import { PageTabs, PageTabsPanel } from "@/components/layout/page-tabs";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormSchemaProvider,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { financialSettingsSchema } from "@/features/settings/schemas/financial-settings-profile";
import { BusinessFinancialEstimateSettingsSection } from "@/features/settings/components/business-financial-estimate-settings-section";
import { BusinessFinancialInvoiceSettingsSection } from "@/features/settings/components/business-financial-invoice-settings-section";
import {
  FINANCIAL_SETTINGS_TABS,
  useBusinessFinancialSettings,
} from "@/features/settings/hooks/use-business-financial-settings";

export function BusinessFinancialSettings() {
  const {
    canEdit,
    activeTab,
    setActiveTab,
    isLoading,
    form,
    invoicePreview,
    estimatePreview,
    mutation,
  } = useBusinessFinancialSettings();

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="w-full min-w-0 space-y-6">
      <PageHeader />
      <Form {...form}>
        <FormSchemaProvider schema={financialSettingsSchema}>
          <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="w-full min-w-0 space-y-6"
          >
            <PageTabs
              value={activeTab}
              onValueChange={setActiveTab}
              tabs={[...FINANCIAL_SETTINGS_TABS]}
            >
              <PageTabsPanel value="invoice">
                <BusinessFinancialInvoiceSettingsSection
                  form={form}
                  canEdit={canEdit}
                  invoicePreview={invoicePreview}
                />
              </PageTabsPanel>

              <PageTabsPanel value="estimate">
                <BusinessFinancialEstimateSettingsSection
                  form={form}
                  canEdit={canEdit}
                  estimatePreview={estimatePreview}
                />
              </PageTabsPanel>
            </PageTabs>

            {canEdit ? (
              <FormActions>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Saving…" : "Save changes"}
                </Button>
              </FormActions>
            ) : (
              <p className="text-sm text-muted-foreground">
                Only owners, admins, and platform administrators can edit
                financial settings.
              </p>
            )}
          </form>
        </FormSchemaProvider>
      </Form>
    </div>
  );
}
