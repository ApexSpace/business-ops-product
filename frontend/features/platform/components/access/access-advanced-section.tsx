"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { previewPlatformBusinessAccessAction } from "@/features/platform/api/business-access.api";
import { ActionImpactPreviewDialog } from "@/features/platform/components/access/action-impact-preview-dialog";
import type {
  BusinessAccess,
  BusinessAccessStatus,
  SubscriptionAccessStatus,
  SubscriptionPaymentMethod,
  SubscriptionPaymentStatus,
} from "@/features/platform/types/business-access";
import type {
  ManualAccessUpdateInput,
  PreviewActionResult,
} from "@/features/platform/types/business-subscription";
import { applySubscriptionStatusDefaults } from "@/features/platform/utils/business-access-defaults";
import {
  executeSubscriptionAction,
  type SubscriptionActionPayload,
} from "@/features/platform/utils/subscription-action-executor";
import {
  businessStatusOptions,
  subscriptionPaymentMethodOptions,
  subscriptionPaymentStatusOptions,
  subscriptionStatusOptions,
} from "@/features/platform/utils/select-options";

function toDateInput(value?: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}

export function AccessAdvancedSection({
  businessId,
  access,
  canUpdate,
  onSuccess,
}: {
  businessId: string;
  access: BusinessAccess;
  canUpdate: boolean;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [businessStatus, setBusinessStatus] = useState<BusinessAccessStatus>(
    access.businessStatus,
  );
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionAccessStatus>(access.subscription?.status ?? "TRIALING");
  const [paymentMethod, setPaymentMethod] = useState<SubscriptionPaymentMethod>(
    access.subscription?.paymentMethod ?? "NOT_SELECTED",
  );
  const [paymentStatus, setPaymentStatus] = useState<SubscriptionPaymentStatus>(
    access.subscription?.paymentStatus ?? "NOT_REQUIRED",
  );
  const [currentPeriodStart, setCurrentPeriodStart] = useState(
    toDateInput(access.subscription?.currentPeriodStart),
  );
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState(
    toDateInput(access.subscription?.currentPeriodEnd),
  );
  const [amount, setAmount] = useState(access.subscription?.amount ?? "");
  const [currency, setCurrency] = useState(access.subscription?.currency ?? "USD");
  const [notes, setNotes] = useState(access.subscription?.notes ?? "");
  const [reason, setReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [preview, setPreview] = useState<PreviewActionResult | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const buildManualUpdate = (): ManualAccessUpdateInput => ({
    businessStatus,
    subscriptionStatus,
    paymentMethod,
    paymentStatus,
    currentPeriodStart: currentPeriodStart || null,
    currentPeriodEnd: currentPeriodEnd || null,
    amount: amount ? Number(amount) : null,
    currency: currency || null,
    notes: notes || null,
    reason,
    adminNotes,
  });

  const previewMutation = useMutation({
    mutationFn: () =>
      previewPlatformBusinessAccessAction(businessId, {
        actionKey: "MANUAL_ADJUSTMENT",
        input: buildManualUpdate() as unknown as Record<string, unknown>,
      }),
    onSuccess: (result) => {
      setPreview(result);
      setPreviewOpen(true);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const executeMutation = useMutation({
    mutationFn: () => {
      const payload: SubscriptionActionPayload = {
        manualUpdate: buildManualUpdate(),
      };
      return executeSubscriptionAction(businessId, "MANUAL_ADJUSTMENT", payload);
    },
    onSuccess: () => {
      toast.success("Advanced settings saved");
      setPreviewOpen(false);
      onSuccess();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubscriptionStatusChange = (value: SubscriptionAccessStatus) => {
    setSubscriptionStatus(value);
    const defaults = applySubscriptionStatusDefaults(value);
    setBusinessStatus(defaults.businessStatus);
    setPaymentMethod(defaults.paymentMethod);
    setPaymentStatus(defaults.paymentStatus);
  };

  const handlePreview = () => {
    if (!reason.trim() || !adminNotes.trim()) {
      toast.error("Reason and notes are required for manual adjustments");
      return;
    }
    previewMutation.mutate();
  };

  return (
    <>
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => setOpen((v) => !v)}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Advanced</CardTitle>
            {open ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </div>
        </CardHeader>
        {open && (
          <CardContent className="space-y-4">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Manual adjustments require a reason and notes. Changes are previewed
              before applying.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Business status">
                <SearchableSelect
                  items={businessStatusOptions}
                  value={businessStatus}
                  onValueChange={(v) => v && setBusinessStatus(v as BusinessAccessStatus)}
                  disabled={!canUpdate}
                />
              </Field>
              <Field label="Subscription status">
                <SearchableSelect
                  items={subscriptionStatusOptions.filter((o) => o.value !== "PAST_DUE")}
                  value={subscriptionStatus}
                  onValueChange={(v) =>
                    v && handleSubscriptionStatusChange(v as SubscriptionAccessStatus)
                  }
                  disabled={!canUpdate}
                />
              </Field>
              <Field label="Payment method">
                <SearchableSelect
                  items={subscriptionPaymentMethodOptions}
                  value={paymentMethod}
                  onValueChange={(v) =>
                    v && setPaymentMethod(v as SubscriptionPaymentMethod)
                  }
                  disabled={!canUpdate}
                />
              </Field>
              <Field label="Payment status">
                <SearchableSelect
                  items={subscriptionPaymentStatusOptions}
                  value={paymentStatus}
                  onValueChange={(v) =>
                    v && setPaymentStatus(v as SubscriptionPaymentStatus)
                  }
                  disabled={!canUpdate}
                />
              </Field>
              <Field label="Period start">
                <Input
                  type="date"
                  value={currentPeriodStart}
                  onChange={(e) => setCurrentPeriodStart(e.target.value)}
                  disabled={!canUpdate}
                />
              </Field>
              <Field label="Period end">
                <Input
                  type="date"
                  value={currentPeriodEnd}
                  onChange={(e) => setCurrentPeriodEnd(e.target.value)}
                  disabled={!canUpdate}
                />
              </Field>
              <Field label="Amount">
                <Input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={!canUpdate}
                />
              </Field>
              <Field label="Currency">
                <Input
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  disabled={!canUpdate}
                />
              </Field>
            </div>
            <Field label="Subscription notes">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={!canUpdate}
              />
            </Field>
            <Field label="Reason (required)">
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={!canUpdate}
              />
            </Field>
            <Field label="Admin notes (required)">
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                disabled={!canUpdate}
              />
            </Field>
            {canUpdate && (
              <Button
                onClick={handlePreview}
                disabled={previewMutation.isPending}
              >
                Preview & apply
              </Button>
            )}
          </CardContent>
        )}
      </Card>

      <ActionImpactPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        preview={preview}
        actionLabel="Manual Adjustment"
        isExecuting={executeMutation.isPending}
        onConfirm={() => executeMutation.mutate()}
      />
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
