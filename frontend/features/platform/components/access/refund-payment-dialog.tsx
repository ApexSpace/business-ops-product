"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { refundPlatformBusinessSubscriptionPayment } from "@/features/platform/api/business-access.api";
import type {
  BusinessSubscriptionPayment,
  RefundPaymentInput,
} from "@/features/platform/types/business-subscription";

export function RefundPaymentDialog({
  businessId,
  payment,
  open,
  onOpenChange,
  onSuccess,
}: {
  businessId: string;
  payment: BusinessSubscriptionPayment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState(payment?.amount ?? "");
  const [paymentType, setPaymentType] = useState<"REFUND" | "CREDIT">("REFUND");
  const [notes, setNotes] = useState("");

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setAmount("");
      setPaymentType("REFUND");
      setNotes("");
    } else if (payment) {
      setAmount(payment.amount);
      setPaymentType("REFUND");
      setNotes("");
    }
    onOpenChange(next);
  };

  const saveMutation = useMutation({
    mutationFn: (body: RefundPaymentInput) =>
      refundPlatformBusinessSubscriptionPayment(businessId, payment!.id, body),
    onSuccess: () => {
      toast.success("Refund recorded");
      onOpenChange(false);
      onSuccess();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!payment) return null;

  const handleSubmit = () => {
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    saveMutation.mutate({
      amount: parsed,
      paymentType,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refund / Credit</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Original payment: {payment.amount} {payment.currency} ({payment.paymentMethod})
          </p>
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
            <Label>Type</Label>
            <RadioGroup
              value={paymentType}
              onValueChange={(v) => setPaymentType(v as "REFUND" | "CREDIT")}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="REFUND" id="refund-type" />
                <Label htmlFor="refund-type" className="font-normal">
                  Refund (outgoing)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="CREDIT" id="credit-type" />
                <Label htmlFor="credit-type" className="font-normal">
                  Credit (outgoing)
                </Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
            Record {paymentType === "REFUND" ? "refund" : "credit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
