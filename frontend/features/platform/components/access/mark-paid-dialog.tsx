"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ActionImpactPreviewDialog } from "@/features/platform/components/access/action-impact-preview-dialog";
import { previewPlatformBusinessAccessAction } from "@/features/platform/api/business-access.api";
import type {
  BusinessAccess,
  SubscriptionPaymentMethod,
} from "@/features/platform/types/business-access";
import type {
  MarkPaidInput,
  PreviewActionResult,
} from "@/features/platform/types/business-subscription";
import { executeSubscriptionAction } from "@/features/platform/utils/subscription-action-executor";
import { subscriptionPaymentMethodOptions } from "@/features/platform/utils/select-options";
import { toDateInputValue } from "@/features/platform/utils/business-access-defaults";

function todayInput(): string {
  return toDateInputValue(new Date());
}

export function MarkPaidDialog({
  businessId,
  access,
  open,
  onOpenChange,
  onSuccess,
}: {
  businessId: string;
  access: BusinessAccess;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const sub = access.subscription;

  const defaults = useMemo(
    () => ({
      amount: sub?.amount ?? sub?.suggestedAmount ?? "",
      currency: sub?.currency ?? sub?.suggestedCurrency ?? "USD",
      paymentMethod: (sub?.paymentMethod !== "NOT_SELECTED"
        ? sub?.paymentMethod
        : "MANUAL_INVOICE") as SubscriptionPaymentMethod,
      periodStart: sub?.currentPeriodStart?.slice(0, 10) ?? todayInput(),
      periodEnd: sub?.currentPeriodEnd?.slice(0, 10) ?? "",
      paidAt: todayInput(),
    }),
    [sub],
  );

  const [amount, setAmount] = useState(defaults.amount);
  const [currency, setCurrency] = useState(defaults.currency);
  const [paymentMethod, setPaymentMethod] = useState<SubscriptionPaymentMethod>(
    defaults.paymentMethod,
  );
  const [periodStart, setPeriodStart] = useState(defaults.periodStart);
  const [periodEnd, setPeriodEnd] = useState(defaults.periodEnd);
  const [paidAt, setPaidAt] = useState(defaults.paidAt);
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");
  const [skipPaymentRecord, setSkipPaymentRecord] = useState(false);
  const [skipReason, setSkipReason] = useState("");
  const [preview, setPreview] = useState<PreviewActionResult | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmount(defaults.amount);
    setCurrency(defaults.currency);
    setPaymentMethod(defaults.paymentMethod);
    setPeriodStart(defaults.periodStart);
    setPeriodEnd(defaults.periodEnd);
    setPaidAt(defaults.paidAt);
    setPaymentReference("");
    setNotes("");
    setSkipPaymentRecord(false);
    setSkipReason("");
    setPreview(null);
    setPreviewOpen(false);
  }, [open, defaults]);

  const buildInput = (): MarkPaidInput => ({
    amount: skipPaymentRecord ? undefined : Number(amount) || undefined,
    currency: skipPaymentRecord ? undefined : currency,
    paymentMethod,
    periodStart: periodStart || undefined,
    periodEnd: periodEnd || undefined,
    paidAt: paidAt || undefined,
    paymentReference: paymentReference || undefined,
    notes: notes || undefined,
    skipPaymentRecord,
    reason: skipPaymentRecord ? skipReason : undefined,
  });

  const previewMutation = useMutation({
    mutationFn: () =>
      previewPlatformBusinessAccessAction(businessId, {
        actionKey: "MARK_PAID",
        input: buildInput() as Record<string, unknown>,
      }),
    onSuccess: (result) => {
      setPreview(result);
      setPreviewOpen(true);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const executeMutation = useMutation({
    mutationFn: () =>
      executeSubscriptionAction(businessId, "MARK_PAID", {
        markPaid: buildInput(),
      }),
    onSuccess: () => {
      toast.success("Payment recorded");
      setPreviewOpen(false);
      onOpenChange(false);
      onSuccess();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const canPreview =
    skipPaymentRecord
      ? Boolean(skipReason.trim() && notes.trim())
      : Boolean(amount && currency && paymentMethod && paidAt);

  return (
    <>
      <Dialog open={open && !previewOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Mark Paid</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={amount}
                  disabled={skipPaymentRecord}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input
                  value={currency}
                  maxLength={3}
                  disabled={skipPaymentRecord}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Payment method</Label>
                <SearchableSelect
                  inDialog
                  items={subscriptionPaymentMethodOptions.filter(
                    (o) => o.value !== "NOT_SELECTED" && o.value !== "FREE_INTERNAL",
                  )}
                  value={paymentMethod}
                  onValueChange={(v) =>
                    v && setPaymentMethod(v as SubscriptionPaymentMethod)
                  }
                  disabled={skipPaymentRecord}
                />
              </div>
              <div className="space-y-2">
                <Label>Paid at</Label>
                <Input
                  type="date"
                  value={paidAt}
                  disabled={skipPaymentRecord}
                  onChange={(e) => setPaidAt(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Payment reference</Label>
                <Input
                  value={paymentReference}
                  disabled={skipPaymentRecord}
                  onChange={(e) => setPaymentReference(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Billing period start</Label>
                <Input
                  type="date"
                  value={periodStart}
                  disabled={skipPaymentRecord}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Billing period end</Label>
                <Input
                  type="date"
                  value={periodEnd}
                  disabled={skipPaymentRecord}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-md border p-3">
              <Checkbox
                id="skip-payment-record"
                checked={skipPaymentRecord}
                onCheckedChange={(v) => setSkipPaymentRecord(v === true)}
              />
              <div className="space-y-1">
                <Label htmlFor="skip-payment-record" className="font-normal">
                  Do not create payment record
                </Label>
                <p className="text-xs text-muted-foreground">
                  Requires a reason and notes below.
                </p>
              </div>
            </div>

            {skipPaymentRecord ? (
              <div className="space-y-2">
                <Label>Reason (required)</Label>
                <Textarea
                  value={skipReason}
                  onChange={(e) => setSkipReason(e.target.value)}
                  rows={2}
                />
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => previewMutation.mutate()}
              disabled={!canPreview || previewMutation.isPending}
            >
              Preview & confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ActionImpactPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        preview={preview}
        actionLabel="Mark Paid"
        isExecuting={executeMutation.isPending}
        onConfirm={() => executeMutation.mutate()}
      />
    </>
  );
}
