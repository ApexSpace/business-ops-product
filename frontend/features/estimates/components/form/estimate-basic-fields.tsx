"use client";

import { useEffect, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { ContactPicker } from "@/features/contacts/components/contact-picker";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { FormOptionalSection } from "@/components/forms/form-optional-section";
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
import { EstimateExpiryHint } from "@/features/payments/components/financial-due-date-hint";
import type { EstimateStatus } from "@/features/estimates/types";

interface EstimateBasicFieldsProps {
  form: UseFormReturn<EstimateFormValues>;
  dialogOpen?: boolean;
  isEdit: boolean;
  estimateNumberPreview?: string;
  estimateStatus?: EstimateStatus;
  lockContact?: boolean;
  lockedContact?: { id: string; label: string };
  workItemItems: { value: string; label: string }[];
  contactId?: string;
}

export function EstimateBasicFields({
  form,
  dialogOpen = true,
  isEdit,
  estimateNumberPreview,
  estimateStatus,
  lockContact,
  lockedContact,
  workItemItems,
  contactId,
}: EstimateBasicFieldsProps) {
  const workItemId = form.watch("workItemId");
  const expiryDate = form.watch("expiryDate");

  const [workItemOpen, setWorkItemOpen] = useState(false);
  const [expiryOpen, setExpiryOpen] = useState(false);

  useEffect(() => {
    if (!dialogOpen) {
      setWorkItemOpen(false);
      setExpiryOpen(false);
      return;
    }
    setWorkItemOpen(!!workItemId?.trim());
    setExpiryOpen(!!expiryDate?.trim());
  }, [dialogOpen, workItemId, expiryDate]);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {!isEdit && estimateNumberPreview ? (
          <div className="grid gap-1.5 sm:col-span-2">
            <Label>
              Estimate number
              <span className="font-normal text-muted-foreground">
                {" "}(Assigned when saved.)
              </span>
            </Label>
            <Input
              value={estimateNumberPreview}
              readOnly
              disabled
              className="bg-muted/40"
            />
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
      </div>

      <FormOptionalSection
        label="Link work item"
        open={workItemOpen}
        onOpenChange={setWorkItemOpen}
      >
        <FormField
          control={form.control}
          name="workItemId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Work item</FormLabel>
              <FormControl>
                <SearchableSelect
                  items={workItemItems}
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  placeholder="Select work item"
                  disabled={!contactId}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormOptionalSection>

      <FormOptionalSection
        label="Add expiry date"
        open={expiryOpen}
        onOpenChange={setExpiryOpen}
      >
        <FormField
          control={form.control}
          name="expiryDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Expiry date</FormLabel>
              <FormControl>
                <Input type="date" {...field} value={field.value ?? ""} />
              </FormControl>
              {estimateStatus ? (
                <EstimateExpiryHint
                  status={estimateStatus}
                  expiryDate={expiryDate}
                />
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />
      </FormOptionalSection>
    </>
  );
}

export function EstimateFormFooterFields({
  form,
  dialogOpen = true,
}: {
  form: UseFormReturn<EstimateFormValues>;
  dialogOpen?: boolean;
}) {
  const notes = form.watch("notes");
  const termsAndConditions = form.watch("termsAndConditions");

  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    if (!dialogOpen) {
      setDetailsOpen(false);
      return;
    }
    setDetailsOpen(!!(notes?.trim() || termsAndConditions?.trim()));
  }, [dialogOpen, notes, termsAndConditions]);

  return (
    <FormOptionalSection
      label="Add notes or terms"
      open={detailsOpen}
      onOpenChange={setDetailsOpen}
    >
      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notes</FormLabel>
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
            <FormLabel>Terms &amp; conditions</FormLabel>
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
    </FormOptionalSection>
  );
}
