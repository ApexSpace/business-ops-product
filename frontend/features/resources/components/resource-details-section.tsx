"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { SettingsChoiceRadioGroup } from "@/components/forms/settings-choice-radio-group";
import { SettingsFormStack } from "@/components/forms/settings-form-grid";
import { SelectField } from "@/components/forms/select-field";
import { TextField } from "@/components/forms/text-field";
import { SettingsInlineEditSection } from "@/components/layout/settings-inline-edit-section";
import { SettingsViewRows } from "@/components/layout/settings-view-rows";
import { Form, FormSchemaProvider } from "@/components/ui/form";
import type { ResourceGroup, ResourceListItem } from "@/features/resources/types";
import {
  capacitySummaryLabel,
  capacityToForm,
  resourceDetailsFormToApiBody,
  resourceDetailsSchema,
  type ResourceDetailsFormValues,
} from "@/features/resources/schemas/resource-details";
import { resourceTypeLabel } from "@/features/resources/utils/resource-schedule.util";
import { useSettingsSectionEdit } from "@/lib/settings/use-settings-section-edit";

type ResourceDetailsSectionProps = {
  resource: ResourceListItem;
  groups: ResourceGroup[];
  isSaving?: boolean;
  onSave: (body: Record<string, unknown>) => Promise<void> | void;
};

export function ResourceDetailsSection({
  resource,
  groups,
  isSaving = false,
  onSave,
}: ResourceDetailsSectionProps) {
  const { isEditing, startEdit, stopEdit } =
    useSettingsSectionEdit<"details">();

  const form = useForm<ResourceDetailsFormValues>({
    resolver: zodResolver(resourceDetailsSchema),
    defaultValues: toFormValues(resource),
  });

  const capacityMode = useWatch({
    control: form.control,
    name: "capacityMode",
  });

  useEffect(() => {
    form.reset(toFormValues(resource));
    stopEdit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource.id, resource.updatedAt]);

  return (
    <Form {...form}>
      <FormSchemaProvider schema={resourceDetailsSchema}>
        <SettingsInlineEditSection
          title="Details"
          summary={
            <SettingsViewRows
              rows={[
                { label: "Name", value: resource.name },
                {
                  label: "How many appointments can use this resource at the same time?",
                  value: capacitySummaryLabel(resource.capacity),
                },
                {
                  label: "Type",
                  value: resourceTypeLabel(resource.resourceType),
                },
                {
                  label: "Group",
                  value: resource.groupName ?? "Ungrouped",
                },
                {
                  label: "Status",
                  value: resource.status === "ACTIVE" ? "Active" : "Inactive",
                },
              ]}
            />
          }
          isEditing={isEditing("details")}
          onEdit={() => startEdit("details")}
          onDiscard={() => {
            form.reset(toFormValues(resource));
            stopEdit();
          }}
          onSave={() =>
            void form.handleSubmit(async (values) => {
              await onSave(resourceDetailsFormToApiBody(values));
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
              label="Name"
              placeholder="Enter name"
            />

            <div className="space-y-[var(--spacing-3)]">
              <p className="text-sm font-medium text-foreground">
                How many appointments can use this resource at the same time?
              </p>
              <SettingsChoiceRadioGroup
                name="capacity"
                aria-label="Resource capacity"
                value={capacityMode}
                onValueChange={(value) => {
                  form.setValue(
                    "capacityMode",
                    value as ResourceDetailsFormValues["capacityMode"],
                    { shouldDirty: true },
                  );
                  if (value === "one") {
                    form.setValue("capacityValue", 1, { shouldDirty: true });
                  }
                  if (value === "unlimited") {
                    form.setValue("capacityValue", undefined, {
                      shouldDirty: true,
                    });
                  }
                }}
                options={[
                  {
                    value: "one",
                    label: "One appointment at a time",
                    description:
                      "Most common option. Only one appointment can be assigned at a time.",
                  },
                  {
                    value: "specific",
                    label: "Specific number of appointments",
                    description:
                      "Allow a fixed number of overlapping appointments for this resource.",
                    children: (
                      <TextField
                        control={form.control}
                        name="capacityValue"
                        label="Number of Appointments"
                        placeholder="Enter the capacity"
                        type="number"
                        valueAsNumber
                      />
                    ),
                  },
                  {
                    value: "unlimited",
                    label: "No limit of appointments",
                    description:
                      "Advanced option for resources with no capacity limit.",
                  },
                ]}
              />
            </div>

            <SelectField
              control={form.control}
              name="resourceType"
              label="Type"
              searchable={false}
              items={[
                { value: "ROOM", label: "Room" },
                { value: "EQUIPMENT", label: "Equipment" },
                { value: "CONSUMABLE", label: "Consumable" },
              ]}
            />

            <SelectField
              control={form.control}
              name="groupId"
              label="Group"
              placeholder="No group"
              items={[
                { value: null, label: "No group" },
                ...groups.map((g) => ({ value: g.id, label: g.name })),
              ]}
            />

            <SelectField
              control={form.control}
              name="status"
              label="Status"
              searchable={false}
              items={[
                { value: "ACTIVE", label: "Active" },
                { value: "INACTIVE", label: "Inactive" },
              ]}
            />
          </SettingsFormStack>
        </SettingsInlineEditSection>
      </FormSchemaProvider>
    </Form>
  );
}

function toFormValues(resource: ResourceListItem): ResourceDetailsFormValues {
  const capacity = capacityToForm(resource.capacity);
  return {
    name: resource.name,
    resourceType: resource.resourceType,
    groupId: resource.groupId ?? "",
    status: resource.status,
    capacityMode: capacity.capacityMode,
    capacityValue: capacity.capacityValue,
  };
}
