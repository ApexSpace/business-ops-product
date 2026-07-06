"use client";

import { SearchableSelect } from "@/components/forms/searchable-select";
import {
  DRAWER_FOOTER_ACTIONS_CLASS,
  DRAWER_FOOTER_BUTTON_CLASS,
  DRAWER_SHEET_FOOTER_CLASS,
} from "@/components/forms/drawer-sheet";
import { ActionButton } from "@/components/ui/action-button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SheetFooter } from "@/components/ui/sheet";
import { leadStatusOptions } from "@/features/leads/utils/select-options";
import type { UseFormReturn } from "react-hook-form";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LeadDetailFormValues {
  title?: string;
  value?: string;
  status: "ACTIVE" | "WON" | "LOST" | "ARCHIVED";
  pipelineStageId: string;
  serviceId?: string;
  source?: string;
  notes?: string;
  assignedToId?: string;
}

interface LeadDetailSheetFormProps {
  form: UseFormReturn<LeadDetailFormValues>;
  canAssign: boolean;
  stageItems: { value: string; label: string }[];
  serviceItems: { value: string; label: string }[];
  assigneeItems: { value: string; label: string }[];
  isPending: boolean;
  onCancel: () => void;
  onDelete: () => void;
  onSubmit: (values: LeadDetailFormValues) => void;
}

export function LeadDetailSheetForm({
  form,
  canAssign,
  stageItems,
  serviceItems,
  assigneeItems,
  isPending,
  onCancel,
  onDelete,
  onSubmit,
}: LeadDetailSheetFormProps) {
  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-1 flex-col gap-4 px-4 pb-4"
    >
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Title (optional)</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Deal title" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="pipelineStageId"
        render={({ field }) => (
          <FormItem className="w-full">
            <FormLabel>Stage</FormLabel>
            <FormControl>
              <SearchableSelect
                items={stageItems}
                value={field.value || null}
                onValueChange={(v) => field.onChange(v ?? "")}
                placeholder="Select stage"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="value"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Value (USD)</FormLabel>
            <FormControl>
              <Input {...field} type="number" min={0} step="0.01" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="status"
        render={({ field }) => (
          <FormItem className="w-full">
            <FormLabel>Status</FormLabel>
            <FormControl>
              <SearchableSelect
                items={leadStatusOptions}
                value={field.value}
                onValueChange={field.onChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="serviceId"
        render={({ field }) => (
          <FormItem className="w-full">
            <FormLabel>Service</FormLabel>
            <FormControl>
              <SearchableSelect
                items={serviceItems}
                value={field.value || null}
                onValueChange={(v) => field.onChange(v ?? "")}
                placeholder="Select service"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {canAssign ? (
        <FormField
          control={form.control}
          name="assignedToId"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>Assigned to</FormLabel>
              <FormControl>
                <SearchableSelect
                  items={assigneeItems}
                  value={field.value || null}
                  onValueChange={(v) => field.onChange(v ?? "")}
                  placeholder="Unassigned"
                  emptyMessage="No team members found"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      <FormField
        control={form.control}
        name="source"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Source</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormControl>
              <Textarea {...field} rows={4} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <SheetFooter className={DRAWER_SHEET_FOOTER_CLASS}>
        <div className="flex w-full flex-wrap items-center justify-end gap-2.5">
          <ActionButton
            type="button"
            variant="destructive"
            onClick={onDelete}
            className={cn(DRAWER_FOOTER_BUTTON_CLASS, "mr-auto")}
          >
            <Trash2 className="size-4" />
            Delete
          </ActionButton>
          <div className={DRAWER_FOOTER_ACTIONS_CLASS}>
            <ActionButton
              type="button"
              variant="outline"
              onClick={onCancel}
              className={DRAWER_FOOTER_BUTTON_CLASS}
            >
              Cancel
            </ActionButton>
            <ActionButton
              type="submit"
              disabled={isPending}
              className={DRAWER_FOOTER_BUTTON_CLASS}
            >
              {isPending ? "Saving…" : "Save"}
            </ActionButton>
          </div>
        </div>
      </SheetFooter>
    </form>
  );
}
