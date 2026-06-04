"use client";

import { ContactPicker } from "@/features/contacts/components/contact-picker";
import { SearchableSelect } from "@/components/forms/searchable-select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { UseFormReturn } from "react-hook-form";
import type { CreateLeadFormValues } from "@/features/leads/hooks/use-create-lead-dialog";
import type { Pipeline } from "@/features/leads/types";

function getFirstStageId(pipeline?: Pipeline): string {
  if (!pipeline?.stages.length) return "";
  return [...pipeline.stages].sort((a, b) => a.position - b.position)[0].id;
}

interface CreateLeadFormFieldsProps {
  form: UseFormReturn<CreateLeadFormValues>;
  lockPipeline: boolean;
  lockedContact?: { id: string; label: string };
  pipelineItems: { value: string; label: string }[];
  stageItems: { value: string; label: string }[];
  serviceItems: { value: string; label: string }[];
  assigneeItems: { value: string; label: string }[];
  canAssign: boolean;
  pipelines?: Pipeline[];
}

export function CreateLeadFormFields({
  form,
  lockPipeline,
  lockedContact,
  pipelineItems,
  stageItems,
  serviceItems,
  assigneeItems,
  canAssign,
  pipelines,
}: CreateLeadFormFieldsProps) {
  return (
    <>
      <FormField
        control={form.control}
        name="contactId"
        render={({ field }) => (
          <FormItem className="w-full">
            <FormLabel>Contact</FormLabel>
            <FormControl>
              <ContactPicker
                value={field.value}
                onValueChange={field.onChange}
                placeholder="Search or add contact…"
                locked={!!lockedContact}
                lockedContact={lockedContact}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {!lockPipeline ? (
        <FormField
          control={form.control}
          name="pipelineId"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>Pipeline</FormLabel>
              <FormControl>
                <SearchableSelect
                  items={pipelineItems}
                  value={field.value || null}
                  onValueChange={(v) => {
                    const pipelineId = v ?? "";
                    field.onChange(pipelineId);
                    const pipeline = pipelines?.find((p) => p.id === pipelineId);
                    form.setValue("pipelineStageId", getFirstStageId(pipeline));
                  }}
                  placeholder="Select pipeline"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
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
                disabled={stageItems.length === 0}
                emptyMessage="This pipeline has no stages yet."
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
            <FormLabel>Service (optional)</FormLabel>
            <FormControl>
              <SearchableSelect
                items={serviceItems}
                value={field.value || null}
                onValueChange={(v) => field.onChange(v ?? "")}
                placeholder="Select service"
                emptyMessage="No services yet. Add services in your catalog first."
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Title (optional)</FormLabel>
            <FormControl>
              <Input {...field} />
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
            <FormLabel>Value (USD, optional)</FormLabel>
            <FormControl>
              <Input {...field} type="number" min={0} step="0.01" />
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
              <FormLabel>Assigned to (optional)</FormLabel>
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
    </>
  );
}
