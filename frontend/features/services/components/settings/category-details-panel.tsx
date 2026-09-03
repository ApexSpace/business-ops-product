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
import type { ServiceTreeCategory } from "@/features/services/api/service-workspace.api";
import {
  categoryNameSchema,
  type CategoryNameFormValues,
} from "@/features/services/schemas/category-name";
import { useSettingsSectionEdit } from "@/lib/settings/use-settings-section-edit";
import { SETTINGS_CONTENT_SHELL_CLASS } from "@/lib/design/settings-form-tokens";
import { cn } from "@/lib/utils";

type CategoryDetailsPanelProps = {
  category: ServiceTreeCategory;
  onSave: (name: string) => Promise<void> | void;
  onDelete: () => void;
  isSaving?: boolean;
};

export function CategoryDetailsPanel({
  category,
  onSave,
  onDelete,
  isSaving = false,
}: CategoryDetailsPanelProps) {
  const { isEditing, startEdit, stopEdit } =
    useSettingsSectionEdit<"details">();

  const form = useForm<CategoryNameFormValues>({
    resolver: zodResolver(categoryNameSchema),
    defaultValues: { name: category.name },
  });

  useEffect(() => {
    form.reset({ name: category.name });
    stopEdit();
    // Reset when switching categories only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category.id, category.name]);

  return (
    <div className={cn(SETTINGS_CONTENT_SHELL_CLASS, "max-w-3xl")}>
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          {category.name}
        </h2>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<MoreActionsButton aria-label="Category actions" />}
          />
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              variant="destructive"
              onClick={onDelete}
            >
              Delete category
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Form {...form}>
        <FormSchemaProvider schema={categoryNameSchema}>
          <SettingsInlineEditSection
            title="Details"
            summary={
              <SettingsViewRows
                rows={[{ label: "Category Name", value: category.name }]}
              />
            }
            isEditing={isEditing("details")}
            onEdit={() => startEdit("details")}
            onDiscard={() => {
              form.reset({ name: category.name });
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
              label="Category Name"
              placeholder="Enter category name"
            />
          </SettingsInlineEditSection>
        </FormSchemaProvider>
      </Form>
    </div>
  );
}
