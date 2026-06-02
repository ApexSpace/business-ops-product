"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FormActions } from "@/components/layout/form-actions";
import { PageHeader } from "@/components/layout/page-header";
import { PageTabs, PageTabsPanel } from "@/components/layout/page-tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSchemaProvider,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api-client";
import {
  financialSettingsDefaults,
  financialSettingsFormToApiBody,
  financialSettingsSchema,
  financialSettingsToForm,
  type FinancialSettingsFormValues,
  type FinancialSettingsResponse,
} from "@/lib/financial-settings-profile";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/lib/auth-provider";
import { canManageBusinessSettings } from "@/lib/permissions";

const TABS = [
  { value: "invoice", label: "Invoice Settings" },
  { value: "estimate", label: "Estimate Settings" },
] as const;

function formatPreview(prefix: string, nextNumber: number): string {
  const normalized = prefix.trim().toUpperCase() || "DOC";
  return `${normalized}-${String(nextNumber).padStart(5, "0")}`;
}

export function BusinessFinancialSettings() {
  const { jwt, contexts } = useAuth();
  const queryClient = useQueryClient();
  const canEdit = canManageBusinessSettings(jwt, contexts);
  const [activeTab, setActiveTab] = useState<string>("invoice");

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.business.financialSettings(),
    queryFn: () =>
      apiClient<FinancialSettingsResponse>("businesses/current/financial-settings"),
  });

  const form = useForm<FinancialSettingsFormValues>({
    resolver: zodResolver(financialSettingsSchema),
    defaultValues: financialSettingsDefaults,
  });

  useEffect(() => {
    if (data) {
      form.reset(financialSettingsToForm(data));
    }
  }, [data, form]);

  const invoicePrefix = form.watch("invoice.prefix");
  const invoiceNext = form.watch("invoice.nextNumber");
  const estimatePrefix = form.watch("estimate.prefix");
  const estimateNext = form.watch("estimate.nextNumber");

  const invoicePreview = useMemo(
    () => formatPreview(invoicePrefix ?? "INV", invoiceNext ?? 1),
    [invoicePrefix, invoiceNext],
  );
  const estimatePreview = useMemo(
    () => formatPreview(estimatePrefix ?? "EST", estimateNext ?? 1),
    [estimatePrefix, estimateNext],
  );

  const mutation = useMutation({
    mutationFn: (values: FinancialSettingsFormValues) =>
      apiClient<FinancialSettingsResponse>("businesses/current/financial-settings", {
        method: "PATCH",
        body: financialSettingsFormToApiBody(values),
      }),
    onSuccess: (result) => {
      toast.success("Financial settings saved");
      form.reset(financialSettingsToForm(result));
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
        <FormSchemaProvider schema={financialSettingsSchema}>
          <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="w-full min-w-0 space-y-6"
          >
          <PageTabs
            value={activeTab}
            onValueChange={setActiveTab}
            tabs={[...TABS]}
          >
            <PageTabsPanel value="invoice">
              <p className="text-sm text-muted-foreground">
                Defaults applied when creating new invoices. Business details and tax settings are managed in Business Profile.
              </p>
              <div className="grid items-start gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="invoice.prefix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice prefix</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          maxLength={10}
                          className="uppercase"
                          disabled={!canEdit}
                          onChange={(e) =>
                            field.onChange(e.target.value.toUpperCase())
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-1.5">
                  <FormField
                    control={form.control}
                    name="invoice.nextNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Next invoice number</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value, 10) || 1)
                            }
                            disabled={!canEdit}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p className="text-sm text-muted-foreground">
                    Preview: {invoicePreview}
                  </p>
                </div>
                <FormField
                  control={form.control}
                  name="invoice.defaultPaymentTerms"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Default payment terms</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Net 30"
                          disabled={!canEdit}
                        />
                      </FormControl>
                      <FormDescription>
                        Used to pre-fill due dates (e.g. &quot;Net 30&quot; → 30 days).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="invoice.defaultNotes"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Default notes</FormLabel>
                      <FormControl>
                        <Textarea rows={3} {...field} disabled={!canEdit} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="invoice.defaultTermsAndConditions"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Default terms &amp; conditions</FormLabel>
                      <FormControl>
                        <Textarea rows={4} {...field} disabled={!canEdit} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="space-y-3 rounded-lg border border-border/70 p-4">
                <p className="text-sm font-medium">Document display</p>
                {(
                  [
                    ["invoice.showLogo", "Show logo"],
                    ["invoice.showBusinessAddress", "Show business address"],
                    ["invoice.showPaymentInstructions", "Show payment instructions"],
                  ] as const
                ).map(([name, label]) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!canEdit}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">{label}</FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </PageTabsPanel>

            <PageTabsPanel value="estimate">
              <p className="text-sm text-muted-foreground">
                Defaults applied when creating new estimates. Business details and tax settings are managed in Business Profile.
              </p>
              <div className="grid items-start gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="estimate.prefix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimate prefix</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          maxLength={10}
                          className="uppercase"
                          disabled={!canEdit}
                          onChange={(e) =>
                            field.onChange(e.target.value.toUpperCase())
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-1.5">
                  <FormField
                    control={form.control}
                    name="estimate.nextNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Next estimate number</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value, 10) || 1)
                            }
                            disabled={!canEdit}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p className="text-sm text-muted-foreground">
                    Preview: {estimatePreview}
                  </p>
                </div>
                <FormField
                  control={form.control}
                  name="estimate.defaultExpiryDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default expiry days</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value, 10) || 1)
                          }
                          disabled={!canEdit}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="estimate.defaultNotes"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Default notes</FormLabel>
                      <FormControl>
                        <Textarea rows={3} {...field} disabled={!canEdit} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="estimate.defaultTermsAndConditions"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Default terms &amp; conditions</FormLabel>
                      <FormControl>
                        <Textarea rows={4} {...field} disabled={!canEdit} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="space-y-3 rounded-lg border border-border/70 p-4">
                <p className="text-sm font-medium">Document display</p>
                {(
                  [
                    ["estimate.showLogo", "Show logo"],
                    ["estimate.showBusinessAddress", "Show business address"],
                  ] as const
                ).map(([name, label]) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!canEdit}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">{label}</FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
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
