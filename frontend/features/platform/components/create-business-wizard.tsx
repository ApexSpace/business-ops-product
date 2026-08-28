"use client";

import { useEffect, useMemo, useState } from "react";
import { NavArrowIcon } from "@/components/ui/nav-arrow-icon";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckboxField } from "@/components/forms/checkbox-field";
import { PhoneField } from "@/components/forms/phone-field";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { TextField } from "@/components/forms/text-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { listPlatformAddons } from "@/features/platform/api/addons.api";
import { createPlatformBusiness } from "@/features/platform/api/platform.api";
import {
  listPlatformTiers,
  type PlatformTier,
} from "@/features/platform/api/tiers.api";
import type {
  SubscriptionPaymentMethod,
  UnpaidAccessMode,
} from "@/features/platform/types/business-access";
import {
  deriveAccessFromPaymentChoice,
  getAccessWarnings,
  getBrowserTimezone,
  getCreateSuccessToast,
  getDefaultTrialEnd,
  hasBlockingAccessWarnings,
  splitFullName,
  toDateInputValue,
  UNPAID_ACCESS_OPTIONS,
} from "@/features/platform/utils/business-access-defaults";
import {
  formatBusinessStatus,
  formatPaymentMethod,
  formatPaymentStatus,
  formatSubscriptionStatus,
} from "@/features/platform/utils/access-labels";
import {
  billingCycleOptions,
  subscriptionPaymentMethodOptions,
} from "@/features/platform/utils/select-options";
import type { BusinessSubscriptionBillingCycle } from "@/features/platform/types/business-subscription";
import {
  computePeriodEndFromBillingCycle,
  formatBillingCycleLabel,
  resolveTierPriceFromStrings,
} from "@/features/platform/utils/tier-price.util";
import { hasPhoneDigits, phoneToApiFields } from "@/lib/forms/phone";
import { invalidatePlatformBusinesses } from "@/lib/query/invalidation";
import { resolveBusinessAccess } from "@/features/platform/utils/business-access-resolver.util";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, title: "Business", description: "Name and owner contact" },
  { id: 2, title: "Tier", description: "Tier and optional add-ons" },
  { id: 3, title: "Payment", description: "Billing cycle, access, and payment" },
  { id: 4, title: "Review", description: "Confirm details before creating" },
] as const;

const MAX_STEP = STEPS.length;

const wizardDetailsSchema = z
  .object({
    name: z.string().min(2, "Business name is required").max(200),
    fullName: z.string().max(200).optional(),
    email: z
      .string()
      .max(255)
      .optional()
      .or(z.literal("")),
    phone: z.string().optional(),
    inviteOwner: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const email = data.email?.trim() ?? "";
    if (data.inviteOwner) {
      if (!email) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["email"],
          message: "Email is required to send an invite",
        });
      } else if (!z.string().email().safeParse(email).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["email"],
          message: "Enter a valid email",
        });
      }
    } else if (email && !z.string().email().safeParse(email).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message: "Enter a valid email",
      });
    }
  });

type WizardDetailsValues = z.infer<typeof wizardDetailsSchema>;

const detailsDefaults: WizardDetailsValues = {
  name: "",
  fullName: "",
  email: "",
  phone: "",
  inviteOwner: true,
};

interface PaymentFormState {
  paymentCollected: boolean;
  unpaidAccessMode: UnpaidAccessMode;
  billingCycle: BusinessSubscriptionBillingCycle;
  paymentMethod: SubscriptionPaymentMethod;
  currentPeriodStart: string;
  currentPeriodEnd?: string;
  amount?: string;
  currency: string;
  paymentReference?: string;
  notes?: string;
}

const paymentDefaults: PaymentFormState = {
  paymentCollected: false,
  unpaidAccessMode: "TRIAL",
  billingCycle: "MONTHLY",
  paymentMethod: "MANUAL_INVOICE",
  currentPeriodStart: toDateInputValue(new Date()),
  currentPeriodEnd: getDefaultTrialEnd(14),
  currency: "USD",
};

const collectedPaymentMethods = subscriptionPaymentMethodOptions.filter(
  (o) => o.value !== "NOT_SELECTED" && o.value !== "FREE_INTERNAL",
);

function formatTierSelectLabel(tier: PlatformTier): string {
  const price = tier.priceMonthly
    ? ` · $${Number(tier.priceMonthly).toFixed(0)}/mo`
    : "";
  return `${tier.name}${price}`;
}

function formatLimit(value: number | null | undefined): string {
  if (value == null) return "Unlimited";
  return String(value);
}

export function CreateBusinessWizard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [skipPackageOpen, setSkipPackageOpen] = useState(false);
  const [planTierId, setPlanTierId] = useState<string | null>(null);
  const [purchaseAddonIds, setPurchaseAddonIds] = useState<string[]>([]);
  const [payment, setPayment] = useState<PaymentFormState>(paymentDefaults);
  const [showNotesField, setShowNotesField] = useState(false);
  const [showReferenceField, setShowReferenceField] = useState(false);

  const router = useRouter();
  const queryClient = useQueryClient();

  const detailsForm = useForm<WizardDetailsValues>({
    resolver: zodResolver(wizardDetailsSchema),
    defaultValues: detailsDefaults,
  });

  const inviteOwner = detailsForm.watch("inviteOwner");

  const { data: tiers } = useQuery({
    queryKey: ["platform", "tiers", { status: "PUBLISHED", limit: 100 }],
    queryFn: () => listPlatformTiers({ status: "PUBLISHED", limit: 100 }),
    enabled: open,
  });

  const { data: addons } = useQuery({
    queryKey: [
      "platform",
      "addons",
      { purchaseMode: "INDEPENDENT", status: "PUBLISHED", limit: 100 },
    ],
    queryFn: () =>
      listPlatformAddons({
        purchaseMode: "INDEPENDENT",
        status: "PUBLISHED",
        limit: 100,
      }),
    enabled: open,
  });

  const selectedTier = tiers?.items.find((t) => t.id === planTierId);
  const trialDays = selectedTier?.trialDays ?? 14;

  const selectedPurchaseAddons = useMemo(
    () =>
      (addons?.items ?? []).filter((addon) =>
        purchaseAddonIds.includes(addon.id),
      ),
    [addons?.items, purchaseAddonIds],
  );

  const accessDefaults = useMemo(
    () =>
      deriveAccessFromPaymentChoice({
        paymentCollected: payment.paymentCollected,
        unpaidAccessMode: payment.unpaidAccessMode,
      }),
    [payment.paymentCollected, payment.unpaidAccessMode],
  );

  useEffect(() => {
    if (payment.paymentCollected) {
      setPayment((prev) => ({
        ...prev,
        currentPeriodStart: prev.currentPeriodStart || toDateInputValue(new Date()),
      }));
    } else if (payment.unpaidAccessMode === "TRIAL" && !payment.currentPeriodEnd) {
      setPayment((prev) => ({
        ...prev,
        currentPeriodStart: prev.currentPeriodStart || toDateInputValue(new Date()),
        currentPeriodEnd: getDefaultTrialEnd(trialDays),
      }));
    } else if (payment.unpaidAccessMode === "INTERNAL") {
      setPayment((prev) => ({
        ...prev,
        billingCycle: "CUSTOM",
      }));
    }
  }, [
    payment.paymentCollected,
    payment.unpaidAccessMode,
    payment.currentPeriodEnd,
    trialDays,
  ]);

  useEffect(() => {
    if (!selectedTier || payment.unpaidAccessMode === "INTERNAL") return;
    const resolved = resolveTierPriceFromStrings(selectedTier, payment.billingCycle);
    setPayment((prev) => {
      const start = prev.currentPeriodStart || toDateInputValue(new Date());
      const amount = resolved != null ? String(resolved) : prev.amount;
      const currency = selectedTier.currency || prev.currency;
      let currentPeriodEnd = prev.currentPeriodEnd;

      if (payment.paymentCollected) {
        currentPeriodEnd =
          payment.billingCycle === "CUSTOM"
            ? prev.currentPeriodEnd
            : computePeriodEndFromBillingCycle(payment.billingCycle, start) ??
              prev.currentPeriodEnd;
      } else if (payment.unpaidAccessMode === "TRIAL") {
        currentPeriodEnd = getDefaultTrialEnd(selectedTier.trialDays ?? 14);
      }

      return {
        ...prev,
        amount,
        currency,
        currentPeriodStart: start,
        currentPeriodEnd,
      };
    });
  }, [
    selectedTier,
    payment.billingCycle,
    payment.paymentCollected,
    payment.unpaidAccessMode,
    payment.currentPeriodStart,
  ]);

  const previewResolution = useMemo(
    () =>
      resolveBusinessAccess({
        businessStatus: accessDefaults.businessStatus,
        snapshotId: undefined,
        subscription: {
          status: accessDefaults.subscriptionStatus,
          planTierId,
          paymentStatus: accessDefaults.paymentStatus,
          currentPeriodEnd: payment.currentPeriodEnd,
        },
        capabilities:
          selectedTier?.capabilities?.map((c) => ({
            key: c.key,
            name: c.name,
          })) ?? [],
        hasPendingOwnerInvite:
          detailsForm.watch("inviteOwner") &&
          accessDefaults.businessStatus !== "ACTIVE",
      }),
    [
      accessDefaults,
      planTierId,
      selectedTier,
      payment.currentPeriodEnd,
      detailsForm,
    ],
  );

  const warnings = useMemo(
    () =>
      getAccessWarnings({
        businessStatus: accessDefaults.businessStatus,
        subscriptionStatus: accessDefaults.subscriptionStatus,
        paymentMethod: payment.paymentMethod,
        paymentStatus: accessDefaults.paymentStatus,
        planTierId,
        currentPeriodEnd: payment.currentPeriodEnd,
        paymentCollected: payment.paymentCollected,
        unpaidAccessMode: payment.unpaidAccessMode,
      }),
    [accessDefaults, payment, planTierId],
  );

  const blockingWarnings = hasBlockingAccessWarnings({
    paymentCollected: payment.paymentCollected,
    unpaidAccessMode: payment.unpaidAccessMode,
    subscriptionStatus: accessDefaults.subscriptionStatus,
    currentPeriodEnd: payment.currentPeriodEnd,
    amount: payment.amount,
    paymentMethod: payment.paymentMethod,
  });

  const periodEndLabel = useMemo(() => {
    if (payment.paymentCollected) {
      return payment.billingCycle === "ONE_TIME" ? "Service end" : "Next billing date";
    }
    if (payment.unpaidAccessMode === "TRIAL") return "Trial end";
    if (payment.unpaidAccessMode === "PENDING_PAYMENT") return "Payment due";
    return "Period end";
  }, [payment.paymentCollected, payment.unpaidAccessMode, payment.billingCycle]);

  const isPeriodEndAutoCalculated =
    payment.paymentCollected && payment.billingCycle !== "CUSTOM";

  const mutation = useMutation({
    mutationFn: async () => {
      const details = detailsForm.getValues();
      const { firstName, lastName } = splitFullName(details.fullName);
      const phoneFields = hasPhoneDigits(details.phone ?? "")
        ? phoneToApiFields(details.phone!)
        : {};

      const amount = payment.amount ? Number(payment.amount) : undefined;
      const recordInitialPayment =
        payment.paymentCollected && amount != null && amount > 0;

      return createPlatformBusiness({
        name: details.name.trim(),
        firstName,
        lastName,
        displayName: details.fullName?.trim() || undefined,
        email: details.email?.trim() || undefined,
        ...phoneFields,
        timezone: getBrowserTimezone(),
        taxesAndCurrency: {
          currencyCode: payment.currency || "USD",
          defaultTaxRate: 0,
          pricesIncludeTax: false,
        },
        planTierId: planTierId ?? undefined,
        ...(purchaseAddonIds.length > 0 ? { purchaseAddonIds } : {}),
        billingCycle:
          payment.unpaidAccessMode === "INTERNAL"
            ? undefined
            : payment.billingCycle,
        amount,
        currency: payment.currency || undefined,
        notes: payment.notes || undefined,
        paymentCollected: payment.paymentCollected,
        unpaidAccessMode: payment.paymentCollected
          ? undefined
          : payment.unpaidAccessMode,
        paymentMethod: payment.paymentCollected
          ? payment.paymentMethod
          : payment.unpaidAccessMode === "PENDING_PAYMENT"
            ? payment.paymentMethod
            : undefined,
        currentPeriodStart: payment.currentPeriodStart || undefined,
        currentPeriodEnd: payment.currentPeriodEnd || undefined,
        paymentReference: payment.paymentCollected
          ? payment.paymentReference
          : undefined,
        syncCapabilitiesFromTier: Boolean(planTierId),
        recordInitialPayment,
        inviteOwner: details.inviteOwner && Boolean(details.email?.trim()),
      });
    },
    onSuccess: (business) => {
      const amount = payment.amount ? Number(payment.amount) : undefined;
      const invited =
        detailsForm.getValues("inviteOwner") &&
        Boolean(detailsForm.getValues("email")?.trim());
      const baseToast = getCreateSuccessToast({
        paymentCollected: payment.paymentCollected,
        unpaidAccessMode: payment.unpaidAccessMode,
        paymentRecorded:
          payment.paymentCollected && amount != null && amount > 0,
      });
      toast.success(
        invited
          ? `${baseToast} Owner invite sent — they set a password via the Accept invite link.`
          : baseToast,
      );
      void invalidatePlatformBusinesses(queryClient);
      setOpen(false);
      resetWizard();
      router.push(`/platform/businesses/${business.id}?tab=access`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetWizard = () => {
    setStep(1);
    setPlanTierId(null);
    setPurchaseAddonIds([]);
    setPayment({
      ...paymentDefaults,
      currentPeriodStart: toDateInputValue(new Date()),
      currentPeriodEnd: getDefaultTrialEnd(14),
    });
    setShowNotesField(false);
    setShowReferenceField(false);
    detailsForm.reset(detailsDefaults);
  };

  const handlePaymentCollectedChange = (collected: boolean) => {
    const defaults = deriveAccessFromPaymentChoice({
      paymentCollected: collected,
      unpaidAccessMode: payment.unpaidAccessMode,
    });
    setPayment((prev) => ({
      ...prev,
      paymentCollected: collected,
      paymentMethod: collected ? "MANUAL_INVOICE" : defaults.paymentMethod,
      currentPeriodStart:
        defaults.currentPeriodStart ?? prev.currentPeriodStart,
      currentPeriodEnd: collected
        ? computePeriodEndFromBillingCycle(
            prev.billingCycle,
            prev.currentPeriodStart,
          ) ?? prev.currentPeriodEnd
        : defaults.currentPeriodEnd ?? prev.currentPeriodEnd,
    }));
  };

  const handleUnpaidModeChange = (mode: UnpaidAccessMode) => {
    const defaults = deriveAccessFromPaymentChoice({
      paymentCollected: false,
      unpaidAccessMode: mode,
    });
    setPayment((prev) => ({
      ...prev,
      unpaidAccessMode: mode,
      paymentMethod: defaults.paymentMethod,
      currentPeriodStart:
        defaults.currentPeriodStart ?? prev.currentPeriodStart,
      currentPeriodEnd:
        mode === "TRIAL"
          ? getDefaultTrialEnd(trialDays)
          : prev.currentPeriodEnd,
      billingCycle: mode === "INTERNAL" ? "CUSTOM" : prev.billingCycle,
    }));
  };

  const handleBillingCycleChange = (cycle: BusinessSubscriptionBillingCycle) => {
    setPayment((prev) => {
      const start = prev.currentPeriodStart || toDateInputValue(new Date());
      const resolved = selectedTier
        ? resolveTierPriceFromStrings(selectedTier, cycle)
        : null;
      const end =
        prev.paymentCollected && cycle !== "CUSTOM"
          ? computePeriodEndFromBillingCycle(cycle, start) ?? prev.currentPeriodEnd
          : prev.currentPeriodEnd;
      return {
        ...prev,
        billingCycle: cycle,
        currentPeriodStart: start,
        currentPeriodEnd: end,
        amount: resolved != null ? String(resolved) : prev.amount,
      };
    });
  };

  const togglePurchaseAddon = (addonId: string, checked: boolean) => {
    setPurchaseAddonIds((prev) => {
      if (checked) {
        return prev.includes(addonId) ? prev : [...prev, addonId];
      }
      return prev.filter((id) => id !== addonId);
    });
  };

  const canGoNext = () => {
    if (step === 1) return Boolean(detailsForm.watch("name")?.trim());
    if (step === 2) return true;
    if (step === 3) return !blockingWarnings;
    return true;
  };

  const handleNext = async () => {
    if (step === 1) {
      const valid = await detailsForm.trigger();
      if (!valid) return;
    }
    if (step === 2 && !planTierId) {
      setSkipPackageOpen(true);
      return;
    }
    if (step === 3 && blockingWarnings) return;
    if (!canGoNext()) return;
    setStep((s) => Math.min(MAX_STEP, s + 1));
  };

  const handleCreate = async () => {
    const valid = await detailsForm.trigger();
    if (!valid || blockingWarnings) return;
    mutation.mutate();
  };

  const showBillingFields = payment.unpaidAccessMode !== "INTERNAL";

  return (
    <>
      <Button type="button" variant="brand" onClick={() => setOpen(true)}>
        Create business
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) resetWizard();
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create business</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {STEPS[step - 1]?.description}
            </p>
          </DialogHeader>
          <DialogBody>
            <div className="mb-4 flex gap-2">
              {STEPS.map((s) => (
                <div
                  key={s.id}
                  className={cn(
                    "h-1 flex-1 rounded-full",
                    s.id <= step ? "bg-primary" : "bg-muted",
                  )}
                />
              ))}
            </div>
            <p className="mb-4 text-sm font-medium">
              Step {step} of {MAX_STEP} · {STEPS[step - 1]?.title}
            </p>

            {step === 1 ? (
              <Form {...detailsForm}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <TextField
                      control={detailsForm.control}
                      name="name"
                      label="Business name"
                      placeholder="Acme Dental"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <TextField
                      control={detailsForm.control}
                      name="fullName"
                      label="Owner full name"
                      placeholder="Jane Smith"
                      description={
                        inviteOwner
                          ? "Recommended when sending an invite."
                          : "Optional"
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <TextField
                      control={detailsForm.control}
                      name="email"
                      label="Owner email"
                      type="email"
                      placeholder="owner@company.com"
                      description="Optional unless you invite the owner now. Same address receives the Accept invite email."
                    />
                  </div>
                  <PhoneField
                    control={detailsForm.control}
                    name="phone"
                    label="Phone number"
                  />
                  <div className="sm:col-span-2">
                    <CheckboxField
                      control={detailsForm.control}
                      name="inviteOwner"
                      label="Invite owner now"
                      description="Send invite email so they set a password (same as staff invite → Accept invite)."
                    />
                    {inviteOwner && accessDefaults.businessStatus !== "ACTIVE" ? (
                      <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                        Owner will be invited while workspace access is limited. They
                        may not be able to sign in until access is granted.
                      </p>
                    ) : null}
                  </div>
                </div>
              </Form>
            ) : null}

            {step === 2 ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Tier</p>
                  <SearchableSelect
                    items={
                      tiers?.items.map((t) => ({
                        value: t.id,
                        label: formatTierSelectLabel(t),
                      })) ?? []
                    }
                    value={planTierId}
                    onValueChange={(v) => {
                      setPlanTierId(v);
                      setPurchaseAddonIds([]);
                    }}
                    placeholder="Select tier"
                  />
                </div>

                {(addons?.items.length ?? 0) > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      Independent add-ons to purchase
                    </p>
                    <div className="space-y-2 rounded-md border p-3">
                      {addons!.items
                        .filter(
                          (addon) =>
                            !selectedTier?.includedAddons.some(
                              (included) => included.id === addon.id,
                            ),
                        )
                        .map((addon) => {
                        const checked = purchaseAddonIds.includes(addon.id);
                        const priceLabel = addon.priceMonthly
                          ? `$${Number(addon.priceMonthly).toFixed(2)}/mo`
                          : "No monthly price";
                        return (
                          <label
                            key={addon.id}
                            htmlFor={`purchase-addon-${addon.id}`}
                            className="flex cursor-pointer items-start gap-3"
                          >
                            <Checkbox
                              id={`purchase-addon-${addon.id}`}
                              checked={checked}
                              onCheckedChange={(v) =>
                                togglePurchaseAddon(addon.id, v === true)
                              }
                              className="mt-0.5"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium">
                                {addon.name}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {priceLabel}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <p className="text-xs text-muted-foreground">
                  MedSpa workspace defaults are applied automatically. Dependent
                  add-ons linked to the tier are included with no extra charge.
                </p>

                {selectedTier ? (
                  <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
                    <p>
                      <span className="font-medium">Tier:</span>{" "}
                      {selectedTier.name}
                    </p>
                    <p>
                      <span className="font-medium">Staff limit:</span>{" "}
                      {formatLimit(selectedTier.staffLimit)}
                      {" · "}
                      <span className="font-medium">Location limit:</span>{" "}
                      {formatLimit(selectedTier.locationLimit)}
                    </p>
                    <p>
                      <span className="font-medium">Capabilities:</span>{" "}
                      {selectedTier.capabilities?.length ?? 0}
                    </p>
                    {(selectedTier.dependentAddons?.length ?? 0) > 0 ? (
                      <p>
                        <span className="font-medium">Included (dependent):</span>{" "}
                        {selectedTier.dependentAddons.map((a) => a.name).join(", ")}
                      </p>
                    ) : null}
                    {(selectedTier.includedAddons?.length ?? 0) > 0 ? (
                      <p>
                        <span className="font-medium">Included (independent):</span>{" "}
                        {selectedTier.includedAddons.map((a) => a.name).join(", ")}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select a tier to preview limits and included add-ons. You can
                    also continue without a package and configure access later.
                  </p>
                )}
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-6">
                <div className="space-y-3">
                  <p className="text-sm font-medium">Payment collected?</p>
                  <RadioGroup
                    value={payment.paymentCollected ? "yes" : "no"}
                    onValueChange={(v) =>
                      handlePaymentCollectedChange(v === "yes")
                    }
                    className="grid gap-2 sm:grid-cols-2"
                  >
                    <label
                      htmlFor="pay-yes"
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-md border p-3",
                        payment.paymentCollected && "border-primary bg-primary/5",
                      )}
                    >
                      <RadioGroupItem value="yes" id="pay-yes" />
                      <div>
                        <p className="text-sm font-medium">Yes</p>
                        <p className="text-xs text-muted-foreground">
                          Offline payment already received — mark Paid (no card charge).
                        </p>
                      </div>
                    </label>
                    <label
                      htmlFor="pay-no"
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-md border p-3",
                        !payment.paymentCollected && "border-primary bg-primary/5",
                      )}
                    >
                      <RadioGroupItem value="no" id="pay-no" />
                      <div>
                        <p className="text-sm font-medium">No</p>
                        <p className="text-xs text-muted-foreground">
                          Choose trial, pending payment, or internal access.
                        </p>
                      </div>
                    </label>
                  </RadioGroup>
                </div>

                {!payment.paymentCollected ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Access type</p>
                    <OptionCards
                      options={UNPAID_ACCESS_OPTIONS}
                      value={payment.unpaidAccessMode}
                      onChange={(v) => handleUnpaidModeChange(v as UnpaidAccessMode)}
                    />
                  </div>
                ) : null}

                {showBillingFields ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Billing cycle</p>
                      <SearchableSelect
                        items={billingCycleOptions}
                        value={payment.billingCycle}
                        onValueChange={(v) => {
                          if (v) handleBillingCycleChange(v as BusinessSubscriptionBillingCycle);
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Price / amount</p>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={payment.amount ?? ""}
                        onChange={(e) =>
                          setPayment((prev) => ({ ...prev, amount: e.target.value }))
                        }
                      />
                    </div>
                    {payment.paymentCollected ? (
                      <>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Payment method</p>
                          <SearchableSelect
                            items={collectedPaymentMethods}
                            value={payment.paymentMethod}
                            onValueChange={(v) =>
                              v &&
                              setPayment((prev) => ({
                                ...prev,
                                paymentMethod: v as SubscriptionPaymentMethod,
                              }))
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            Admin bookkeeping only — does not charge Stripe or a
                            card. Use this when the customer already paid offline.
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Currency</p>
                          <Input
                            value={payment.currency}
                            onChange={(e) =>
                              setPayment((prev) => ({
                                ...prev,
                                currency: e.target.value.toUpperCase(),
                              }))
                            }
                            maxLength={3}
                          />
                        </div>
                      </>
                    ) : payment.unpaidAccessMode === "PENDING_PAYMENT" ? (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Payment method</p>
                        <SearchableSelect
                          items={subscriptionPaymentMethodOptions.filter(
                            (o) =>
                              o.value !== "FREE_INTERNAL" &&
                              o.value !== "NOT_SELECTED",
                          )}
                          value={payment.paymentMethod}
                          onValueChange={(v) =>
                            v &&
                            setPayment((prev) => ({
                              ...prev,
                              paymentMethod: v as SubscriptionPaymentMethod,
                            }))
                          }
                        />
                      </div>
                    ) : null}
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Start date</p>
                      <Input
                        type="date"
                        value={payment.currentPeriodStart}
                        onChange={(e) => {
                          const start = e.target.value;
                          setPayment((prev) => {
                            const currentPeriodEnd =
                              prev.paymentCollected &&
                              prev.billingCycle !== "CUSTOM"
                                ? computePeriodEndFromBillingCycle(
                                    prev.billingCycle,
                                    start,
                                  ) ?? prev.currentPeriodEnd
                                : prev.currentPeriodEnd;
                            return {
                              ...prev,
                              currentPeriodStart: start,
                              currentPeriodEnd,
                            };
                          });
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{periodEndLabel}</p>
                      {isPeriodEndAutoCalculated ? (
                        <>
                          <Input
                            type="date"
                            value={payment.currentPeriodEnd ?? ""}
                            disabled
                            readOnly
                            className="bg-muted text-muted-foreground"
                          />
                          <p className="text-xs text-muted-foreground">
                            Calculated from billing cycle and start date.
                          </p>
                        </>
                      ) : (
                        <Input
                          type="date"
                          value={payment.currentPeriodEnd ?? ""}
                          onChange={(e) =>
                            setPayment((prev) => ({
                              ...prev,
                              currentPeriodEnd: e.target.value,
                            }))
                          }
                        />
                      )}
                    </div>
                  </div>
                ) : null}

                <PaymentOptionalFieldsSection
                  notes={payment.notes ?? ""}
                  notesVisible={showNotesField}
                  onNotesVisibleChange={setShowNotesField}
                  onNotesChange={(notes) =>
                    setPayment((prev) => ({ ...prev, notes }))
                  }
                  reference={payment.paymentReference ?? ""}
                  referenceVisible={showReferenceField}
                  onReferenceVisibleChange={setShowReferenceField}
                  onReferenceChange={(paymentReference) =>
                    setPayment((prev) => ({ ...prev, paymentReference }))
                  }
                  showReferenceButton={payment.paymentCollected}
                />

                {warnings.length ? (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-sm text-amber-900 dark:text-amber-200">
                    {warnings.map((w) => (
                      <p key={w}>{w}</p>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === 4 ? (
              <div className="space-y-4">
                {warnings.length ? (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-sm text-amber-900 dark:text-amber-200">
                    {warnings.map((w) => (
                      <p key={w}>{w}</p>
                    ))}
                  </div>
                ) : null}

                <Card>
                  <CardContent className="space-y-3 pt-6 text-sm">
                    <p className="font-medium">Review summary</p>
                    <SummaryRow
                      label="Business"
                      value={detailsForm.watch("name") || ""}
                    />
                    <SummaryRow
                      label="Owner"
                      value={
                        detailsForm.watch("fullName")?.trim() ||
                        detailsForm.watch("email")?.trim() ||
                        "No owner contact"
                      }
                    />
                    <SummaryRow
                      label="Invite owner"
                      value={
                        detailsForm.watch("inviteOwner")
                          ? "Yes — credentials via invite link (/accept-invite), not create"
                          : "No"
                      }
                    />
                    <SummaryRow
                      label="Tier"
                      value={
                        selectedTier?.name ?? "None — configure later"
                      }
                    />
                    {selectedPurchaseAddons.length > 0 ? (
                      <SummaryRow
                        label="Add-ons"
                        value={selectedPurchaseAddons
                          .map((a) => a.name)
                          .join(", ")}
                      />
                    ) : null}
                    <SummaryRow
                      label="Billing"
                      value={
                        payment.unpaidAccessMode === "INTERNAL"
                          ? "Free internal"
                          : [
                              formatBillingCycleLabel(payment.billingCycle),
                              payment.amount
                                ? `${payment.amount} ${payment.currency}`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" · ") || ""
                      }
                    />
                    <SummaryRow
                      label="Workspace"
                      value={formatBusinessStatus(accessDefaults.businessStatus)}
                    />
                    <SummaryRow
                      label="Subscription"
                      value={formatSubscriptionStatus(
                        accessDefaults.subscriptionStatus,
                      )}
                    />
                    <SummaryRow
                      label="Payment"
                      value={formatPaymentStatus(accessDefaults.paymentStatus)}
                    />
                    {payment.paymentCollected ? (
                      <SummaryRow
                        label="Payment method"
                        value={formatPaymentMethod(payment.paymentMethod)}
                      />
                    ) : null}
                    {showBillingFields && payment.currentPeriodStart ? (
                      <SummaryRow
                        label="Start date"
                        value={formatDisplayDate(payment.currentPeriodStart)}
                      />
                    ) : null}
                    {showBillingFields && payment.currentPeriodEnd ? (
                      <SummaryRow
                        label={periodEndLabel}
                        value={formatDisplayDate(payment.currentPeriodEnd)}
                      />
                    ) : null}
                    <SummaryRow
                      label="Workspace access"
                      value={
                        previewResolution.canAccessWorkspace
                          ? "Yes — can access"
                          : `No — ${previewResolution.reasonLabel}`
                      }
                    />
                    {payment.paymentReference?.trim() ? (
                      <SummaryRow
                        label="Reference"
                        value={payment.paymentReference.trim()}
                      />
                    ) : null}
                    {payment.notes?.trim() ? (
                      <SummaryRow label="Notes" value={payment.notes.trim()} />
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              disabled={step === 1}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
            >
              <NavArrowIcon direction="left" size="lg" className="mr-1" />
              Back
            </Button>
            {step < MAX_STEP ? (
              <Button type="button" variant="brand" onClick={() => void handleNext()} disabled={!canGoNext()}>
                Next
                <NavArrowIcon direction="right" size="lg" className="ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="brand"
                onClick={() => void handleCreate()}
                disabled={mutation.isPending || blockingWarnings}
              >
                {mutation.isPending ? "Creating…" : "Create business"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={skipPackageOpen} onOpenChange={setSkipPackageOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create without a package?</AlertDialogTitle>
            <AlertDialogDescription>
              No tier is selected. The business will be created without package
              capabilities. You can assign a tier later from the Access tab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setSkipPackageOpen(false);
                setStep(3);
              }}
            >
              Continue without package
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function OptionCards({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string; description: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "w-full rounded-md border p-3 text-left transition-colors",
            value === option.value
              ? "border-primary bg-primary/5"
              : "hover:bg-muted/50",
          )}
        >
          <p className="font-medium">{option.label}</p>
          <p className="text-sm text-muted-foreground">{option.description}</p>
        </button>
      ))}
    </div>
  );
}

function PaymentOptionalFieldsSection({
  notes,
  notesVisible,
  onNotesVisibleChange,
  onNotesChange,
  reference,
  referenceVisible,
  onReferenceVisibleChange,
  onReferenceChange,
  showReferenceButton,
}: {
  notes: string;
  notesVisible: boolean;
  onNotesVisibleChange: (visible: boolean) => void;
  onNotesChange: (notes: string) => void;
  reference: string;
  referenceVisible: boolean;
  onReferenceVisibleChange: (visible: boolean) => void;
  onReferenceChange: (reference: string) => void;
  showReferenceButton: boolean;
}) {
  const hasHiddenField =
    !notesVisible || (showReferenceButton && !referenceVisible);

  return (
    <div className="space-y-3">
      {hasHiddenField ? (
        <div className="flex flex-wrap gap-2">
          {showReferenceButton && !referenceVisible ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onReferenceVisibleChange(true)}
            >
              Add reference
            </Button>
          ) : null}
          {!notesVisible ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onNotesVisibleChange(true)}
            >
              Add notes
            </Button>
          ) : null}
        </div>
      ) : null}

      {showReferenceButton && referenceVisible ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Reference (optional)</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                onReferenceChange("");
                onReferenceVisibleChange(false);
              }}
            >
              Remove
            </Button>
          </div>
          <Input
            value={reference}
            onChange={(e) => onReferenceChange(e.target.value)}
            placeholder="Invoice #, receipt ID"
          />
        </div>
      ) : null}

      {notesVisible ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Notes (optional)</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                onNotesChange("");
                onNotesVisibleChange(false);
              }}
            >
              Remove
            </Button>
          </div>
          <Textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={2}
          />
        </div>
      ) : null}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function formatDisplayDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}
