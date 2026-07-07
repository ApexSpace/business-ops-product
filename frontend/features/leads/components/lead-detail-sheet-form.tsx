"use client";

import { SearchableSelect } from "@/components/forms/searchable-select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { leadStatusOptions } from "@/features/leads/utils/select-options";
import type { UseFormReturn } from "react-hook-form";

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
  formId: string;
  form: UseFormReturn<LeadDetailFormValues>;
  canAssign: boolean;
  stageItems: { value: string; label: string }[];
  serviceItems: { value: string; label: string }[];
  assigneeItems: { value: string; label: string }[];
  onSubmit: (values: LeadDetailFormValues) => void;
}

export function LeadDetailSheetForm({
  formId,
  form,
  canAssign,
  stageItems,
  serviceItems,
  assigneeItems,
  onSubmit,
}: LeadDetailSheetFormProps) {
  return (
    <form
      id={formId}
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
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
    </form>
  );
}
