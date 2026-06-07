"use client";

import { useEffect, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { ContactPicker } from "@/features/contacts/components/contact-picker";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { InvoiceFormOptionalSection } from "@/features/invoices/components/form/invoice-form-optional-section";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { RequiredIndicator } from "@/components/ui/required-indicator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { InvoiceFormValues } from "@/features/invoices/schemas/invoice-profile";
import { InvoiceDueDateHint } from "@/features/payments/components/financial-due-date-hint";
import type { InvoiceStatus } from "@/features/invoices/types";

interface InvoiceBasicFieldsProps {
  form: UseFormReturn<InvoiceFormValues>;
  dialogOpen?: boolean;
  isEdit: boolean;
  invoiceNumberPreview?: string;
  invoiceNumber?: string;
  invoiceStatus?: InvoiceStatus;
  invoiceBalanceDue?: string;
  lockContact?: boolean;
  lockedContact?: { id: string; label: string };
  estimateItems: { value: string; label: string }[];
  workItemItems: { value: string; label: string }[];
  contactId?: string;
}

export function InvoiceBasicFields({
  form,
  dialogOpen = true,
  isEdit,
  invoiceNumberPreview,
  invoiceNumber,
  invoiceStatus,
  invoiceBalanceDue,
  lockContact,
  lockedContact,
  estimateItems,
  workItemItems,
  contactId,
}: InvoiceBasicFieldsProps) {
  const estimateId = form.watch("estimateId");
  const workItemId = form.watch("workItemId");
  const dueDate = form.watch("dueDate");

  const [linksOpen, setLinksOpen] = useState(false);

  useEffect(() => {
    if (!dialogOpen) {
      setLinksOpen(false);
      return;
    }
    setLinksOpen(!!(estimateId?.trim() || workItemId?.trim()));
  }, [dialogOpen, estimateId, workItemId]);

  const displayInvoiceNumber = isEdit
    ? invoiceNumber
    : invoiceNumberPreview;

  return (
    <>
      <div className="grid items-start gap-4 sm:grid-cols-2">
        {displayInvoiceNumber ? (
          <FormItem>
            <Label>
              Invoice number
              {!isEdit ? (
                <span className="font-normal text-muted-foreground">
                  {" "}(Assigned when saved.)
                </span>
              ) : null}
              <RequiredIndicator className="invisible" />
            </Label>
            <Input
              value={displayInvoiceNumber}
              readOnly
              disabled
              className="bg-muted/40"
            />
          </FormItem>
        ) : null}

        <FormField
          control={form.control}
          name="contactId"
          render={({ field }) => (
            <FormItem className={displayInvoiceNumber ? undefined : "sm:col-span-2"}>
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
          name="dueDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Due date</FormLabel>
              <FormControl>
                <Input type="date" {...field} value={field.value ?? ""} />
              </FormControl>
              {invoiceStatus && invoiceBalanceDue ? (
                <InvoiceDueDateHint
                  status={invoiceStatus}
                  dueDate={dueDate}
                  balanceDue={invoiceBalanceDue}
                />
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <InvoiceFormOptionalSection
        label="Link estimate or work item"
        open={linksOpen}
        onOpenChange={setLinksOpen}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="estimateId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estimate</FormLabel>
                <FormControl>
                  <SearchableSelect
                    items={estimateItems}
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    placeholder="Select estimate"
                    disabled={!contactId}
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
        </div>
      </InvoiceFormOptionalSection>
    </>
  );
}

export function InvoiceFormFooterFields({
  form,
  dialogOpen = true,
}: {
  form: UseFormReturn<InvoiceFormValues>;
  dialogOpen?: boolean;
}) {
  const notes = form.watch("notes");
  const paymentTerms = form.watch("paymentTerms");
  const termsAndConditions = form.watch("termsAndConditions");

  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    if (!dialogOpen) {
      setDetailsOpen(false);
      return;
    }
    setDetailsOpen(
      !!(
        notes?.trim() ||
        paymentTerms?.trim() ||
        termsAndConditions?.trim()
      ),
    );
  }, [dialogOpen, notes, paymentTerms, termsAndConditions]);

  return (
    <InvoiceFormOptionalSection
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
                placeholder="Message for your customer…"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="paymentTerms"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Payment terms</FormLabel>
            <FormControl>
              <Input placeholder="Net 30" {...field} value={field.value ?? ""} />
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
                rows={3}
                placeholder="Payment and liability terms…"
                {...field}
                value={field.value ?? ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </InvoiceFormOptionalSection>
  );
}
