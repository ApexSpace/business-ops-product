"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { previewPlatformBusinessAccessAction } from "@/features/platform/api/business-access.api";
import { ActionImpactPreviewDialog } from "@/features/platform/components/access/action-impact-preview-dialog";
import { PackageImpactPreview } from "@/features/platform/components/access/package-impact-preview";
import {
  getPlatformPlanGroupTierDefaults,
  listPlatformPlanGroups,
  listPlatformPlanGroupTiers,
} from "@/features/platform/api/plan-groups.api";
import type { BusinessAccess } from "@/features/platform/types/business-access";
import type { SubscriptionPaymentMethod } from "@/features/platform/types/business-access";
import type {
  BusinessSubscriptionBillingCycle,
  ChangePackagePaymentOption,
  PreviewActionResult,
} from "@/features/platform/types/business-subscription";
import {
  computeCapabilityDiff,
  type EffectiveCapability,
} from "@/features/platform/utils/business-access-resolver.util";
import { toDateInputValue } from "@/features/platform/utils/business-access-defaults";
import {
  executeSubscriptionAction,
  type SubscriptionActionPayload,
} from "@/features/platform/utils/subscription-action-executor";
import {
  billingCycleOptions,
  subscriptionPaymentMethodOptions,
} from "@/features/platform/utils/select-options";
import {
  computePeriodEndFromBillingCycle,
  formatBillingCycleLabel,
  resolveTierPriceFromStrings,
} from "@/features/platform/utils/tier-price.util";
import { queryKeys } from "@/lib/query/keys";
import type { SelectOption } from "@/components/forms/select-field";

function withCurrentOption(
  items: SelectOption[],
  currentId?: string | null,
  currentName?: string | null,
): SelectOption[] {
  if (!currentId || !currentName || items.some((item) => item.value === currentId)) {
    return items;
  }
  return [{ value: currentId, label: `${currentName} (current)` }, ...items];
}

const PAYMENT_OPTIONS: { value: ChangePackagePaymentOption; label: string }[] = [
  { value: "no_payment", label: "No payment now" },
  { value: "record_payment", label: "Record manual payment now" },
  { value: "move_pending", label: "Move to pending payment" },
  { value: "keep_status", label: "Keep current payment status" },
];

export function ChangePackageDialog({
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
  const [step, setStep] = useState(1);
  const [planGroupId, setPlanGroupId] = useState<string | null>(
    access.subscription?.planGroupId ?? null,
  );
  const [planTierId, setPlanTierId] = useState<string | null>(
    access.subscription?.planTierId ?? null,
  );
  const [billingCycle, setBillingCycle] = useState<BusinessSubscriptionBillingCycle>(
    (access.subscription?.billingCycle as BusinessSubscriptionBillingCycle) ?? "MONTHLY",
  );
  const [customPrice, setCustomPrice] = useState(false);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(access.subscription?.currency ?? "USD");
  const [periodStart, setPeriodStart] = useState(
    access.subscription?.currentPeriodStart?.slice(0, 10) ?? toDateInputValue(new Date()),
  );
  const [periodEnd, setPeriodEnd] = useState(
    access.subscription?.currentPeriodEnd?.slice(0, 10) ?? "",
  );
  const [syncCapabilities, setSyncCapabilities] = useState(true);
  const [paymentOption, setPaymentOption] =
    useState<ChangePackagePaymentOption>("no_payment");
  const [paymentMethod, setPaymentMethod] = useState<SubscriptionPaymentMethod>(
    "MANUAL_INVOICE",
  );
  const [paidAt, setPaidAt] = useState(toDateInputValue(new Date()));
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [preview, setPreview] = useState<PreviewActionResult | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const resetForm = () => {
    setStep(1);
    setPlanGroupId(access.subscription?.planGroupId ?? null);
    setPlanTierId(access.subscription?.planTierId ?? null);
    setBillingCycle(
      (access.subscription?.billingCycle as BusinessSubscriptionBillingCycle) ?? "MONTHLY",
    );
    setCustomPrice(false);
    setAmount(access.subscription?.amount ?? "");
    setCurrency(access.subscription?.currency ?? "USD");
    setPeriodStart(
      access.subscription?.currentPeriodStart?.slice(0, 10) ??
        toDateInputValue(new Date()),
    );
    setPeriodEnd(access.subscription?.currentPeriodEnd?.slice(0, 10) ?? "");
    setSyncCapabilities(true);
    setPaymentOption("no_payment");
    setPaymentMethod("MANUAL_INVOICE");
    setPaidAt(toDateInputValue(new Date()));
    setPaymentReference("");
    setPaymentNotes("");
    setPreview(null);
    setPreviewOpen(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const { data: planGroups, isLoading: planGroupsLoading } = useQuery({
    queryKey: queryKeys.platform.planGroups.list({ status: "PUBLISHED", limit: 50 }),
    queryFn: () =>
      listPlatformPlanGroups({ page: 1, limit: 50, status: "PUBLISHED" }),
    enabled: open,
  });

  const { data: tiers, isLoading: tiersLoading } = useQuery({
    queryKey: queryKeys.platform.planGroups.tiers(planGroupId ?? ""),
    queryFn: () => listPlatformPlanGroupTiers(planGroupId!),
    enabled: open && Boolean(planGroupId),
  });

  const selectedTier = tiers?.find((tier) => tier.id === planTierId);

  const { data: tierDefaults } = useQuery({
    queryKey: queryKeys.platform.planGroups.tierDefaults(
      planGroupId ?? "",
      planTierId ?? "",
    ),
    queryFn: () => getPlatformPlanGroupTierDefaults(planGroupId!, planTierId!),
    enabled: open && Boolean(planGroupId) && Boolean(planTierId),
  });

  useEffect(() => {
    if (!selectedTier || customPrice) return;
    const resolved = resolveTierPriceFromStrings(selectedTier, billingCycle);
    if (resolved != null) {
      setAmount(String(resolved));
    }
    if (tierDefaults?.currency) {
      setCurrency(tierDefaults.currency);
    }
  }, [selectedTier, billingCycle, customPrice, tierDefaults?.currency]);

  useEffect(() => {
    if (billingCycle === "CUSTOM") return;
    const end = computePeriodEndFromBillingCycle(billingCycle, periodStart);
    if (end) setPeriodEnd(end);
  }, [billingCycle, periodStart]);

  const currentCapabilities: EffectiveCapability[] = useMemo(
    () =>
      (access.resolution?.effectiveCapabilities ??
        access.capabilities
          .filter((c) => c.status === "ACTIVE")
          .map((c) => ({ key: c.key, name: c.name }))) as EffectiveCapability[],
    [access],
  );

  const preservedKeys = useMemo(
    () =>
      access.capabilities
        .filter((c) => c.source === "CUSTOM" || c.source === "MANUAL")
        .map((c) => c.key),
    [access.capabilities],
  );

  const { toAdd, toRemove } = useMemo(
    () =>
      computeCapabilityDiff(
        currentCapabilities,
        tierDefaults?.capabilities ?? [],
        preservedKeys,
      ),
    [currentCapabilities, tierDefaults, preservedKeys],
  );

  const buildChangePackageInput = () => {
    const numericAmount = Number(amount);
    const input = {
      planGroupId: planGroupId!,
      planTierId: planTierId!,
      billingCycle,
      syncCapabilities,
      paymentOption,
      customPrice,
      amount: customPrice && !Number.isNaN(numericAmount) ? numericAmount : undefined,
      currency,
      currentPeriodStart: periodStart || undefined,
      currentPeriodEnd: periodEnd || undefined,
    };

    if (paymentOption === "record_payment") {
      return {
        ...input,
        payment: {
          amount: numericAmount,
          currency,
          paymentMethod,
          billingCycle,
          periodStart: periodStart || undefined,
          periodEnd: periodEnd || undefined,
          paidAt: new Date(`${paidAt}T12:00:00.000Z`).toISOString(),
          paymentReference: paymentReference || undefined,
          notes: paymentNotes || undefined,
        },
      };
    }

    return input;
  };

  const previewMutation = useMutation({
    mutationFn: () =>
      previewPlatformBusinessAccessAction(businessId, {
        actionKey: "CHANGE_PACKAGE",
        input: buildChangePackageInput(),
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
        changePackage: buildChangePackageInput(),
      };
      return executeSubscriptionAction(businessId, "CHANGE_PACKAGE", payload);
    },
    onSuccess: () => {
      toast.success("Package updated");
      setPreviewOpen(false);
      onOpenChange(false);
      onSuccess();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const planGroupItems = useMemo(
    () =>
      withCurrentOption(
        planGroups?.items.map((g) => ({ value: g.id, label: g.name })) ?? [],
        access.subscription?.planGroupId,
        access.subscription?.planGroupName,
      ),
    [
      planGroups?.items,
      access.subscription?.planGroupId,
      access.subscription?.planGroupName,
    ],
  );

  const tierItems = useMemo(
    () =>
      withCurrentOption(
        tiers?.map((tier) => ({ value: tier.id, label: tier.name })) ?? [],
        access.subscription?.planTierId,
        access.subscription?.planTierName,
      ),
    [tiers, access.subscription?.planTierId, access.subscription?.planTierName],
  );

  const currentSub = access.subscription;

  return (
    <>
      <Dialog open={open && !previewOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Change Package</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              This package change applies immediately.
            </p>

            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Plan Group</Label>
                  <SearchableSelect
                    inDialog
                    items={planGroupItems}
                    value={planGroupId}
                    onValueChange={(v) => {
                      setPlanGroupId(v);
                      setPlanTierId(null);
                    }}
                    placeholder="Select plan group"
                    disabled={planGroupsLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Plan Tier</Label>
                  <SearchableSelect
                    inDialog
                    items={tierItems}
                    value={planTierId}
                    onValueChange={setPlanTierId}
                    placeholder="Select plan tier"
                    disabled={!planGroupId || tiersLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Billing cycle</Label>
                  <SearchableSelect
                    inDialog
                    items={billingCycleOptions}
                    value={billingCycle}
                    onValueChange={(v) =>
                      v && setBillingCycle(v as BusinessSubscriptionBillingCycle)
                    }
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="grid gap-3 rounded-md border p-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Current plan</p>
                    <p className="font-medium">
                      {currentSub?.planTierName ?? "—"} ·{" "}
                      {formatBillingCycleLabel(currentSub?.billingCycle)}
                    </p>
                    <p className="text-muted-foreground">
                      {currentSub?.amount
                        ? `${currentSub.amount} ${currentSub.currency ?? ""}`
                        : "Price not set"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">New plan</p>
                    <p className="font-medium">
                      {selectedTier?.name ?? "—"} · {formatBillingCycleLabel(billingCycle)}
                    </p>
                    <p className="text-muted-foreground">
                      {amount ? `${amount} ${currency}` : "Price not set"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">Custom price</p>
                    <p className="text-xs text-muted-foreground">
                      Override the tier price for this subscription.
                    </p>
                  </div>
                  <Switch checked={customPrice} onCheckedChange={setCustomPrice} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={amount}
                      disabled={!customPrice}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Input
                      value={currency}
                      maxLength={3}
                      onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Period start</Label>
                    <Input
                      type="date"
                      value={periodStart}
                      onChange={(e) => setPeriodStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Period end</Label>
                    <Input
                      type="date"
                      value={periodEnd}
                      disabled={billingCycle !== "CUSTOM"}
                      onChange={(e) => setPeriodEnd(e.target.value)}
                    />
                  </div>
                </div>

                {tierDefaults ? (
                  <PackageImpactPreview
                    snapshotName={tierDefaults.suggestedSnapshotName}
                    capabilities={tierDefaults.capabilities}
                    amount={amount}
                    currency={currency}
                    trialDays={tierDefaults.trialDays}
                    showDiff
                    toAdd={toAdd}
                    toRemove={toRemove}
                  />
                ) : null}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="sync-capabilities"
                    checked={syncCapabilities}
                    onCheckedChange={(v) => setSyncCapabilities(v === true)}
                  />
                  <Label htmlFor="sync-capabilities">
                    Sync capabilities from tier (CUSTOM/MANUAL preserved)
                  </Label>
                </div>
                <div className="space-y-2">
                  <Label>Payment handling</Label>
                  <RadioGroup
                    value={paymentOption}
                    onValueChange={(v) =>
                      setPaymentOption(v as ChangePackagePaymentOption)
                    }
                  >
                    {PAYMENT_OPTIONS.map((opt) => (
                      <div key={opt.value} className="flex items-center gap-2">
                        <RadioGroupItem value={opt.value} id={`pay-${opt.value}`} />
                        <Label htmlFor={`pay-${opt.value}`} className="font-normal">
                          {opt.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {paymentOption === "record_payment" ? (
                  <div className="grid gap-4 rounded-md border p-3 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Payment method</Label>
                      <SearchableSelect
                        inDialog
                        items={subscriptionPaymentMethodOptions.filter(
                          (o) =>
                            o.value !== "NOT_SELECTED" && o.value !== "FREE_INTERNAL",
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
                        type="date"
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
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Payment notes</Label>
                      <Input
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            {step > 1 && (
              <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button
                type="button"
                disabled={step === 1 && (!planGroupId || !planTierId)}
                onClick={() => setStep(step + 1)}
              >
                Next
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => previewMutation.mutate()}
                disabled={previewMutation.isPending}
              >
                Preview & confirm
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ActionImpactPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        preview={preview}
        actionLabel="Change Package"
        isExecuting={executeMutation.isPending}
        onConfirm={() => executeMutation.mutate()}
      />
    </>
  );
}
