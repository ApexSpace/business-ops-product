"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { SettingsInlineEditSection } from "@/components/layout/settings-inline-edit-section";
import { SettingsViewRows } from "@/components/layout/settings-view-rows";
import { TextField } from "@/components/forms/text-field";
import { Form, FormSchemaProvider } from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreActionsButton } from "@/components/ui/more-actions-button";
import type { ResourceGroup } from "@/features/resources/types";
import {
  resourceGroupNameSchema,
  type ResourceGroupNameFormValues,
} from "@/features/resources/schemas/resource-group-name";
import { useSettingsSectionEdit } from "@/lib/settings/use-settings-section-edit";
import { SETTINGS_CONTENT_SHELL_CLASS } from "@/lib/design/settings-form-tokens";
import { cn } from "@/lib/utils";

type ResourceGroupDetailsPanelProps = {
  group: ResourceGroup;
  onSave: (name: string) => Promise<void> | void;
  onDelete: () => void;
  isSaving?: boolean;
};

export function ResourceGroupDetailsPanel({
  group,
  onSave,
  onDelete,
  isSaving = false,
}: ResourceGroupDetailsPanelProps) {
  const { isEditing, startEdit, stopEdit } =
    useSettingsSectionEdit<"details">();

  const form = useForm<ResourceGroupNameFormValues>({
    resolver: zodResolver(resourceGroupNameSchema),
    defaultValues: { name: group.name },
  });

  useEffect(() => {
    form.reset({ name: group.name });
    stopEdit();
    // Reset when switching groups only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.id, group.name]);

  return (
    <div className={cn(SETTINGS_CONTENT_SHELL_CLASS, "max-w-3xl")}>
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          {group.name}
        </h2>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<MoreActionsButton aria-label="Group actions" />}
          />
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              Delete group
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Form {...form}>
        <FormSchemaProvider schema={resourceGroupNameSchema}>
          <SettingsInlineEditSection
            title="Details"
            summary={
              <SettingsViewRows
                rows={[{ label: "Group Name", value: group.name }]}
              />
            }
            isEditing={isEditing("details")}
            onEdit={() => startEdit("details")}
            onDiscard={() => {
              form.reset({ name: group.name });
              stopEdit();
            }}
            onSave={() =>
              void form.handleSubmit(async (values) => {
                await onSave(values.name.trim());
                stopEdit();
              })()
            }
            isDirty={form.formState.isDirty}
            isSaving={isSaving}
          >
            <TextField
              control={form.control}
              name="name"
              label="Group Name"
              placeholder="Enter group name"
            />
          </SettingsInlineEditSection>
        </FormSchemaProvider>
      </Form>
    </div>
  );
}
