"use client";

import type { UseFormReturn } from "react-hook-form";
import { ContactPicker } from "@/features/contacts/components/contact-picker";
import { SearchableSelect } from "@/components/forms/searchable-select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ESTIMATE_MANUAL_STATUS_OPTIONS,
  type EstimateFormValues,
} from "@/features/estimates/schemas/estimate-profile";

interface EstimateBasicFieldsProps {
  form: UseFormReturn<EstimateFormValues>;
  isEdit: boolean;
  estimateNumberPreview?: string;
  lockContact?: boolean;
  lockedContact?: { id: string; label: string };
  workItemItems: { value: string; label: string }[];
  contactId?: string;
}

export function EstimateBasicFields({
  form,
  isEdit,
  estimateNumberPreview,
  lockContact,
  lockedContact,
  workItemItems,
  contactId,
}: EstimateBasicFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {!isEdit && estimateNumberPreview ? (
        <div className="grid gap-1.5">
          <Label>Estimate number</Label>
          <Input
            value={estimateNumberPreview}
            readOnly
            disabled
            className="bg-muted/40"
          />
          <p className="text-xs text-muted-foreground">
            Assigned when saved. Configure prefix in Financial Settings.
          </p>
        </div>
      ) : null}

      <FormField
        control={form.control}
        name="contactId"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Customer</FormLabel>
            <FormControl>
              <ContactPicker
                value={field.value ?? ""}
                onValueChange={field.onChange}
                placeholder="Select customer…"
                locked={!!lockContact}
                lockedContact={lockedContact}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="workItemId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Work item (optional)</FormLabel>
            <FormControl>
              <SearchableSelect
                items={workItemItems}
                value={field.value ?? ""}
                onValueChange={field.onChange}
                placeholder="Link work item"
                disabled={!contactId}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Status</FormLabel>
            <FormControl>
              <SearchableSelect
                items={ESTIMATE_MANUAL_STATUS_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                }))}
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
        name="issueDate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Issue date</FormLabel>
            <FormControl>
              <Input type="date" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="expiryDate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Expiry date (optional)</FormLabel>
            <FormControl>
              <Input type="date" {...field} value={field.value ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

export function EstimateFormFooterFields({
  form,
}: {
  form: UseFormReturn<EstimateFormValues>;
}) {
  return (
    <>
      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notes (optional)</FormLabel>
            <FormControl>
              <Textarea
                rows={3}
                placeholder="Scope, assumptions, or internal notes…"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="termsAndConditions"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Terms &amp; conditions (optional)</FormLabel>
            <FormControl>
              <Textarea
                rows={4}
                placeholder="Validity, acceptance, and liability terms…"
                {...field}
                value={field.value ?? ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
