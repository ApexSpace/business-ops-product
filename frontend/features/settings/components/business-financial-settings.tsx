"use client";

import { useEffect } from "react";
import { SettingsFormPage } from "@/components/layout/settings-page-layout";
import { SettingsInlineEditSection } from "@/components/layout/settings-inline-edit-section";
import { SettingsViewRows } from "@/components/layout/settings-view-rows";
import { SettingsFormStack } from "@/components/forms/settings-form-grid";
import { PageTabs, PageTabsPanel } from "@/components/layout/page-tabs";
import { Form, FormSchemaProvider } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import {
  financialSettingsSchema,
  financialSettingsToForm,
} from "@/features/settings/schemas/financial-settings-profile";
import { BusinessFinancialEstimateSettingsSection } from "@/features/settings/components/business-financial-estimate-settings-section";
import { BusinessFinancialInvoiceSettingsSection } from "@/features/settings/components/business-financial-invoice-settings-section";
import {
  FINANCIAL_SETTINGS_TABS,
  useBusinessFinancialSettings,
} from "@/features/settings/hooks/use-business-financial-settings";
import { useSettingsSectionEdit } from "@/lib/settings/use-settings-section-edit";
import { SETTINGS_FORM_SECTION_STACK_CLASS } from "@/lib/design/settings-form-tokens";
import { useQuery } from "@tanstack/react-query";
import { getFinancialSettings } from "@/features/settings/api/financial.api";
import { queryKeys } from "@/lib/query/keys";

function formatYesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

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
  const { editingSection, startEdit, stopEdit } =
    useSettingsSectionEdit<"invoice" | "estimate">();

  const { data } = useQuery({
    queryKey: queryKeys.business.financialSettings(),
    queryFn: () => getFinancialSettings(),
  });

  useEffect(() => {
    stopEdit();
  }, [activeTab, stopEdit]);

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  const invoiceValues = form.watch("invoice");
  const estimateValues = form.watch("estimate");
  const isEditingInvoice = editingSection === "invoice";
  const isEditingEstimate = editingSection === "estimate";

  return (
    <SettingsFormPage>
      <Form {...form}>
        <FormSchemaProvider schema={financialSettingsSchema}>
          <form
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          >
            <SettingsFormStack>
              <PageTabs
                value={activeTab}
                onValueChange={setActiveTab}
                tabs={[...FINANCIAL_SETTINGS_TABS]}
              >
                <PageTabsPanel value="invoice">
                  <div className={SETTINGS_FORM_SECTION_STACK_CLASS}>
                    <SettingsInlineEditSection
                      title="Invoice Settings"
                      description="Defaults applied when creating new invoices."
                      summary={
                        <SettingsViewRows
                          rows={[
                            {
                              label: "Next invoice number",
                              value: invoicePreview,
                            },
                            {
                              label: "Default payment terms",
                              value: invoiceValues.defaultPaymentTerms,
                            },
                            {
                              label: "Default notes",
                              value: invoiceValues.defaultNotes,
                            },
                            {
                              label: "Show logo",
                              value: formatYesNo(invoiceValues.showLogo),
                            },
                            {
                              label: "Show business address",
                              value: formatYesNo(
                                invoiceValues.showBusinessAddress,
                              ),
                            },
                            {
                              label: "Show payment instructions",
                              value: formatYesNo(
                                invoiceValues.showPaymentInstructions,
                              ),
                            },
                          ]}
                        />
                      }
                      isEditing={isEditingInvoice}
                      onEdit={() => startEdit("invoice")}
                      onDiscard={() => {
                        if (data) form.reset(financialSettingsToForm(data));
                        stopEdit();
                      }}
                      onSave={() =>
                        void form.handleSubmit((values) =>
                          mutation.mutate(values, {
                            onSuccess: () => stopEdit(),
                          }),
                        )()
                      }
                      isDirty={form.formState.isDirty}
                      isSaving={mutation.isPending}
                      disabled={!canEdit}
                    >
                      <BusinessFinancialInvoiceSettingsSection
                        form={form}
                        canEdit={canEdit}
                        invoicePreview={invoicePreview}
                      />
                    </SettingsInlineEditSection>
                  </div>
                </PageTabsPanel>

                <PageTabsPanel value="estimate">
                  <div className={SETTINGS_FORM_SECTION_STACK_CLASS}>
                    <SettingsInlineEditSection
                      title="Estimate Settings"
                      description="Defaults applied when creating new estimates."
                      summary={
                        <SettingsViewRows
                          rows={[
                            {
                              label: "Next estimate number",
                              value: estimatePreview,
                            },
                            {
                              label: "Default expiry (days)",
                              value: String(
                                estimateValues.defaultExpiryDays ?? "",
                              ),
                            },
                            {
                              label: "Default notes",
                              value: estimateValues.defaultNotes,
                            },
                            {
                              label: "Show logo",
                              value: formatYesNo(estimateValues.showLogo),
                            },
                            {
                              label: "Show business address",
                              value: formatYesNo(
                                estimateValues.showBusinessAddress,
                              ),
                            },
                          ]}
                        />
                      }
                      isEditing={isEditingEstimate}
                      onEdit={() => startEdit("estimate")}
                      onDiscard={() => {
                        if (data) form.reset(financialSettingsToForm(data));
                        stopEdit();
                      }}
                      onSave={() =>
                        void form.handleSubmit((values) =>
                          mutation.mutate(values, {
                            onSuccess: () => stopEdit(),
                          }),
                        )()
                      }
                      isDirty={form.formState.isDirty}
                      isSaving={mutation.isPending}
                      disabled={!canEdit}
                    >
                      <BusinessFinancialEstimateSettingsSection
                        form={form}
                        canEdit={canEdit}
                        estimatePreview={estimatePreview}
                      />
                    </SettingsInlineEditSection>
                  </div>
                </PageTabsPanel>
              </PageTabs>

              {!canEdit ? (
                <p className="text-sm text-muted-foreground">
                  Only owners, admins, and platform administrators can edit
                  financial settings.
                </p>
              ) : null}
            </SettingsFormStack>
          </form>
        </FormSchemaProvider>
      </Form>
    </SettingsFormPage>
  );
}
