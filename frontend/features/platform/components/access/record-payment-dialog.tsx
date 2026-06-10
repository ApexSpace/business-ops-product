"use client";

import { useState } from "react";
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
import { recordPlatformBusinessPayment } from "@/features/platform/api/business-access.api";
import type { RecordPaymentInput } from "@/features/platform/types/business-subscription";
import type { SubscriptionPaymentMethod } from "@/features/platform/types/business-access";
import { subscriptionPaymentMethodOptions } from "@/features/platform/utils/select-options";

export function RecordPaymentDialog({
  businessId,
  open,
  onOpenChange,
  defaultCurrency = "USD",
  onSuccess,
}: {
  businessId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCurrency?: string;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [paymentMethod, setPaymentMethod] =
    useState<SubscriptionPaymentMethod>("MANUAL_INVOICE");
  const [paidAt, setPaidAt] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");
  const [activateSubscription, setActivateSubscription] = useState(true);

  const resetForm = () => {
    setAmount("");
    setCurrency(defaultCurrency);
    setPaymentMethod("MANUAL_INVOICE");
    setPaidAt("");
    setPaymentReference("");
    setNotes("");
    setActivateSubscription(true);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const saveMutation = useMutation({
    mutationFn: (body: RecordPaymentInput) =>
      recordPlatformBusinessPayment(businessId, body),
    onSuccess: () => {
      toast.success("Payment recorded");
      onOpenChange(false);
      onSuccess();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubmit = () => {
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    saveMutation.mutate({
      amount: parsed,
      currency: currency || "USD",
      paymentMethod,
      paidAt: paidAt || undefined,
      paymentReference: paymentReference || undefined,
      notes: notes || undefined,
      activateSubscription,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
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
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} />
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
              />
            </div>
            <div className="space-y-2">
              <Label>Paid at</Label>
              <Input
                type="datetime-local"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Reference</Label>
              <Input
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="activate-sub"
              checked={activateSubscription}
              onCheckedChange={(v) => setActivateSubscription(v === true)}
            />
            <Label htmlFor="activate-sub" className="font-normal">
              Activate subscription if eligible
            </Label>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={saveMutation.isPending}
          >
            Record payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
