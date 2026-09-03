"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useForm, useWatch, type Control, type Path } from "react-hook-form";
import { SettingsFormStack } from "@/components/forms/settings-form-grid";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { SelectField } from "@/components/forms/select-field";
import { TextField } from "@/components/forms/text-field";
import { DrawerSegmentedTabs } from "@/components/drawer/drawer-segmented-tabs";
import { SettingsInlineEditSection } from "@/components/layout/settings-inline-edit-section";
import { SettingsViewRows } from "@/components/layout/settings-view-rows";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { listProductPicker } from "@/features/products/api/products.api";
import type { ProductPickerItem } from "@/features/products/types";
import {
  detailsFormToApiBody,
  formatDurationMinutes,
  formatServicePrice,
  serviceDetailsSchema,
  serviceToDetailsForm,
  type ServiceDetailsFormValues,
} from "@/features/services/schemas/service-details";
import type { Service } from "@/features/services/types";
import { durationPresetItems } from "@/features/services/types/selection";
import { DRAWER_SWITCH_CLASS } from "@/lib/design/drawer-tokens";
import { SETTINGS_FORM_DESCRIPTION_CLASS } from "@/lib/design/settings-form-tokens";
import { useSettingsSectionEdit } from "@/lib/settings/use-settings-section-edit";
import { queryKeys } from "@/lib/query/keys";

type ServiceDetailsSectionProps = {
  service: Service;
  durationPresets: number[];
  products: Array<Record<string, unknown>>;
  isSaving?: boolean;
  onSave: (body: Record<string, unknown>) => Promise<void> | void;
  onSaveProducts: (products: Record<string, unknown>[]) => Promise<void>;
};

function productPickerKey(p: ProductPickerItem): string {
  return p.variantId ? `${p.productId}:${p.variantId}` : p.productId;
}

function productPickerLabel(p: ProductPickerItem): string {
  return p.variantLabel ? `${p.name} — ${p.variantLabel}` : p.name;
}

function ToggleField({
  control,
  name,
  label,
  description,
  onCheckedChange,
}: {
  control: Control<ServiceDetailsFormValues>;
  name: Path<ServiceDetailsFormValues>;
  label: string;
  description?: string;
  onCheckedChange?: (checked: boolean) => void;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex items-start justify-between gap-4 space-y-0">
          <div className="min-w-0 space-y-1">
            <FormLabel className="text-sm font-medium">{label}</FormLabel>
            {description ? (
              <FormDescription className={SETTINGS_FORM_DESCRIPTION_CLASS}>
                {description}
              </FormDescription>
            ) : null}
          </div>
          <FormControl>
            <Switch
              checked={Boolean(field.value)}
              onCheckedChange={(checked) => {
                field.onChange(checked);
                onCheckedChange?.(checked);
              }}
              className={DRAWER_SWITCH_CLASS}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

export function ServiceDetailsSection({
  service,
  durationPresets,
  products,
  isSaving = false,
  onSave,
  onSaveProducts,
}: ServiceDetailsSectionProps) {
  const { isEditing, startEdit, stopEdit } =
    useSettingsSectionEdit<"details">();
  const form = useForm<ServiceDetailsFormValues>({
    resolver: zodResolver(serviceDetailsSchema),
    defaultValues: serviceToDetailsForm(service),
  });

  const [productLabel, setProductLabel] = useState("");
  const [selectedPickerKey, setSelectedPickerKey] = useState<string | null>(
    null,
  );

  const usesProducts = useWatch({ control: form.control, name: "usesProducts" });
  const hasProcessingTime = useWatch({
    control: form.control,
    name: "hasProcessingTime",
  });
  const hasBufferTime = useWatch({
    control: form.control,
    name: "hasBufferTime",
  });
  const hasCommissionDeduction = useWatch({
    control: form.control,
    name: "hasCommissionDeduction",
  });
  const commissionType = useWatch({
    control: form.control,
    name: "commissionDeductionType",
  });
  const postCommissionType = useWatch({
    control: form.control,
    name: "postCommissionDeductionType",
  });

  useEffect(() => {
    form.reset(serviceToDetailsForm(service));
    stopEdit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service.id, service.updatedAt]);

  const { data: productPicker = [] } = useQuery({
    queryKey: queryKeys.products.picker(),
    queryFn: () => listProductPicker(),
    enabled: Boolean(usesProducts) && isEditing("details"),
  });

  const durationItems = durationPresetItems(durationPresets);
  const minuteItems = [
    ...durationItems,
    { value: "0", label: "0 min" },
  ];

  const summaryRows = [
    { label: "Service Name", value: service.name },
    { label: "Price", value: formatServicePrice(service.price) },
    {
      label: "Duration",
      value: formatDurationMinutes(service.durationMinutes),
    },
    {
      label: "This service uses products",
      value: service.usesProducts ? "Yes" : "No",
    },
  ];

  const mapProductsForSave = (
    next: Array<Record<string, unknown>>,
  ): Record<string, unknown>[] =>
    next.map((p) => ({
      productId: p.productId ?? undefined,
      variantId: p.variantId ?? undefined,
      label: String(p.label),
      quantity: Number(p.quantity ?? 1),
      unitCost: p.unitCost ? Number(p.unitCost) : undefined,
    }));

  return (
    <Form {...form}>
      <FormSchemaProvider schema={serviceDetailsSchema}>
        <SettingsInlineEditSection
          title="Details"
          summary={<SettingsViewRows rows={summaryRows} />}
          isEditing={isEditing("details")}
          onEdit={() => startEdit("details")}
          onDiscard={() => {
            form.reset(serviceToDetailsForm(service));
            stopEdit();
          }}
          onSave={() =>
            void form.handleSubmit(async (values) => {
              await onSave(detailsFormToApiBody(values));
              stopEdit();
            })()
          }
          isDirty={form.formState.isDirty}
          isSaving={isSaving}
        >
          <SettingsFormStack>
            <TextField
              control={form.control}
              name="name"
              label="Service name"
              placeholder="Enter service name"
            />
            <TextField
              control={form.control}
              name="price"
              label="Price"
              placeholder="Enter price"
              type="number"
            />
            <SelectField
              control={form.control}
              name="durationMinutes"
              label="Duration"
              items={durationItems}
              placeholder="Select duration"
              searchable={false}
            />

            <ToggleField
              control={form.control}
              name="hasProcessingTime"
              label="Has processing time"
              description="Add time during the service when the client is unattended and the provider is available for other appointments."
            />
            {hasProcessingTime ? (
              <div className="space-y-4">
                <SelectField
                  control={form.control}
                  name="processingDurationMinutes"
                  label="Processing Time"
                  items={minuteItems}
                  placeholder="Select processing time"
                  searchable={false}
                />
                <SelectField
                  control={form.control}
                  name="finishDurationMinutes"
                  label="Finishing Time"
                  items={durationItems}
                  placeholder="Select finishing time"
                  searchable={false}
                />
              </div>
            ) : null}

            <ToggleField
              control={form.control}
              name="hasBufferTime"
              label="Has buffer time"
              description="Block time before or after this service for prep or cleanup."
            />
            {hasBufferTime ? (
              <div className="space-y-4">
                <SelectField
                  control={form.control}
                  name="bufferBeforeMinutes"
                  label="Before Buffer Time"
                  items={minuteItems}
                  placeholder="Select before buffer time"
                  searchable={false}
                />
                <SelectField
                  control={form.control}
                  name="bufferAfterMinutes"
                  label="After Buffer Time"
                  items={minuteItems}
                  placeholder="Select after buffer time"
                  searchable={false}
                />
              </div>
            ) : null}

            <Accordion multiple defaultValue={["additional"]}>
              <AccordionItem value="additional" className="border-none">
                <AccordionTrigger className="px-0 text-base font-medium text-violet-primary-normal hover:no-underline">
                  Additional Options
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pb-0">
                  <ToggleField
                    control={form.control}
                    name="usesProducts"
                    label="This service uses products"
                    description="Add products used during this service to track their use in service price and update inventory automatically."
                  />
                  <ToggleField
                    control={form.control}
                    name="requiresNoStaff"
                    label="Requires no staff (resources only)"
                    description="For services like saunas or salt baths that only need a resource."
                    onCheckedChange={(checked) => {
                      if (checked) form.setValue("requiresTwoStaff", false);
                    }}
                  />
                  <ToggleField
                    control={form.control}
                    name="requiresTwoStaff"
                    label="Requires two staff members"
                    description="Book two providers on the calendar for this service."
                    onCheckedChange={(checked) => {
                      if (checked) form.setValue("requiresNoStaff", false);
                    }}
                  />
                  <ToggleField
                    control={form.control}
                    name="hasCommissionDeduction"
                    label="This service has a commission deduction"
                    description="Deduct an amount before or after commission is calculated."
                  />
                  {hasCommissionDeduction ? (
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="commissionDeductionValue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pre-Commission Deduction</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  placeholder="Enter pre-commission deduction"
                                  className="flex-1"
                                />
                              </FormControl>
                              <DrawerSegmentedTabs
                                size="sm"
                                className="w-auto shrink-0"
                                value={commissionType}
                                options={[
                                  {
                                    value: "FLAT",
                                    label: "$",
                                    onClick: () =>
                                      form.setValue(
                                        "commissionDeductionType",
                                        "FLAT",
                                        { shouldDirty: true },
                                      ),
                                  },
                                  {
                                    value: "PERCENT",
                                    label: "%",
                                    onClick: () =>
                                      form.setValue(
                                        "commissionDeductionType",
                                        "PERCENT",
                                        { shouldDirty: true },
                                      ),
                                  },
                                ]}
                              />
                            </div>
                            <FormDescription className="italic">
                              This amount will be deducted from the total amount
                              before commission for a staff member is calculated.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="postCommissionDeductionValue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Post-Commission Deduction</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  placeholder="Enter post-commission deduction"
                                  className="flex-1"
                                />
                              </FormControl>
                              <DrawerSegmentedTabs
                                size="sm"
                                className="w-auto shrink-0"
                                value={postCommissionType}
                                options={[
                                  {
                                    value: "FLAT",
                                    label: "$",
                                    onClick: () =>
                                      form.setValue(
                                        "postCommissionDeductionType",
                                        "FLAT",
                                        { shouldDirty: true },
                                      ),
                                  },
                                  {
                                    value: "PERCENT",
                                    label: "%",
                                    onClick: () =>
                                      form.setValue(
                                        "postCommissionDeductionType",
                                        "PERCENT",
                                        { shouldDirty: true },
                                      ),
                                  },
                                ]}
                              />
                            </div>
                            <FormDescription className="italic">
                              This amount will be deducted from the total amount
                              after commission for a staff member is calculated.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ) : null}
                  <ToggleField
                    control={form.control}
                    name="isDemo"
                    label="Demo service"
                    description="Mark this service as a demo for testing."
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {usesProducts ? (
              <div className="space-y-3 rounded-[var(--radius-control)] border border-border p-4">
                <Label className="text-sm font-medium">Product usages</Label>
                <ul className="space-y-1 text-sm">
                  {products.map((p) => (
                    <li key={String(p.id ?? p.label)}>{String(p.label)}</li>
                  ))}
                </ul>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <SearchableSelect
                    items={productPicker.map((p) => ({
                      value: productPickerKey(p),
                      label: productPickerLabel(p),
                    }))}
                    value={selectedPickerKey}
                    onValueChange={setSelectedPickerKey}
                    placeholder="Select product…"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!selectedPickerKey}
                    onClick={() => {
                      const selected = productPicker.find(
                        (p) => productPickerKey(p) === selectedPickerKey,
                      );
                      if (!selected) return;
                      void onSaveProducts(
                        mapProductsForSave([
                          ...products,
                          {
                            productId: selected.productId,
                            variantId: selected.variantId ?? undefined,
                            label: productPickerLabel(selected),
                            quantity: 1,
                          },
                        ]),
                      );
                      setSelectedPickerKey(null);
                    }}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Or enter label only"
                    value={productLabel}
                    onChange={(e) => setProductLabel(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (!productLabel.trim()) return;
                      void onSaveProducts(
                        mapProductsForSave([
                          ...products,
                          { label: productLabel.trim(), quantity: 1 },
                        ]),
                      );
                      setProductLabel("");
                    }}
                  >
                    Add label
                  </Button>
                </div>
              </div>
            ) : null}

            <TextField
              control={form.control}
              name="description"
              label="Description"
              placeholder="Optional description"
              multiline
              rows={3}
            />
          </SettingsFormStack>
        </SettingsInlineEditSection>
      </FormSchemaProvider>
    </Form>
  );
}
