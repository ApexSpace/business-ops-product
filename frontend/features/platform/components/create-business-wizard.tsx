"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
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
import { createPlatformBusiness } from "@/features/platform/api/platform.api";
import {
  getPlatformPlanGroupDefaults,
  getPlatformPlanGroupTierDefaults,
  listPlatformPlanGroups,
  listPlatformPlanGroupTiers,
} from "@/features/platform/api/plan-groups.api";
import { PackageImpactPreview } from "@/features/platform/components/access/package-impact-preview";
import { listPlatformSnapshots } from "@/features/platform/api/snapshots.api";
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
import { queryKeys } from "@/lib/query/keys";
import { resolveBusinessAccess } from "@/features/platform/utils/business-access-resolver.util";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, title: "Business", description: "Name and owner contact" },
  { id: 2, title: "Package", description: "Plan group, tier, and experience" },
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
  inviteOwner: false,
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

export function CreateBusinessWizard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [skipPackageOpen, setSkipPackageOpen] = useState(false);
  const [planGroupId, setPlanGroupId] = useState<string | null>(null);
  const [planTierId, setPlanTierId] = useState<string | null>(null);
  const [snapshotId, setSnapshotId] = useState<string | null>(null);
  const [snapshotManuallySet, setSnapshotManuallySet] = useState(false);
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

  const { data: planGroups } = useQuery({
    queryKey: queryKeys.platform.planGroups.list({ status: "PUBLISHED", limit: 50 }),
    queryFn: () =>
      listPlatformPlanGroups({ page: 1, limit: 50, status: "PUBLISHED" }),
    enabled: open,
  });

  const { data: tiers } = useQuery({
    queryKey: queryKeys.platform.planGroups.tiers(planGroupId ?? ""),
    queryFn: () => listPlatformPlanGroupTiers(planGroupId!),
    enabled: open && Boolean(planGroupId),
  });

  const { data: groupDefaults } = useQuery({
    queryKey: queryKeys.platform.planGroups.groupDefaults(planGroupId ?? ""),
    queryFn: () => getPlatformPlanGroupDefaults(planGroupId!),
    enabled: open && Boolean(planGroupId),
  });

  const { data: tierDefaults } = useQuery({
    queryKey: queryKeys.platform.planGroups.tierDefaults(
      planGroupId ?? "",
      planTierId ?? "",
    ),
    queryFn: () => getPlatformPlanGroupTierDefaults(planGroupId!, planTierId!),
    enabled: open && Boolean(planGroupId) && Boolean(planTierId),
  });

  const selectedTier = tiers?.find((t) => t.id === planTierId);
  const selectedGroup = planGroups?.items.find((g) => g.id === planGroupId);

  useEffect(() => {
    if (!groupDefaults?.suggestedSnapshotId || snapshotManuallySet) return;
    setSnapshotId(groupDefaults.suggestedSnapshotId);
  }, [groupDefaults, snapshotManuallySet]);

  useEffect(() => {
    if (!tierDefaults || !selectedTier) return;
    if (!snapshotManuallySet && tierDefaults.suggestedSnapshotId) {
      setSnapshotId(tierDefaults.suggestedSnapshotId);
    }
  }, [tierDefaults, selectedTier, snapshotManuallySet]);

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
        currentPeriodEnd: getDefaultTrialEnd(tierDefaults?.trialDays ?? 14),
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
    tierDefaults?.trialDays,
  ]);

  useEffect(() => {
    if (!selectedTier || payment.unpaidAccessMode === "INTERNAL") return;
    const resolved = resolveTierPriceFromStrings(selectedTier, payment.billingCycle);
    setPayment((prev) => {
      const start = prev.currentPeriodStart || toDateInputValue(new Date());
      const amount =
        resolved != null ? String(resolved) : tierDefaults?.amount ?? prev.amount;
      const currency = tierDefaults?.currency ?? prev.currency;
      let currentPeriodEnd = prev.currentPeriodEnd;

      if (payment.paymentCollected) {
        currentPeriodEnd =
          payment.billingCycle === "CUSTOM"
            ? prev.currentPeriodEnd
            : computePeriodEndFromBillingCycle(payment.billingCycle, start) ??
              prev.currentPeriodEnd;
      } else if (payment.unpaidAccessMode === "TRIAL" && tierDefaults?.trialDays) {
        currentPeriodEnd = getDefaultTrialEnd(tierDefaults.trialDays);
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
    tierDefaults,
    payment.billingCycle,
    payment.paymentCollected,
    payment.unpaidAccessMode,
    payment.currentPeriodStart,
  ]);

  const { data: snapshots } = useQuery({
    queryKey: queryKeys.platform.snapshots.list({
      status: "PUBLISHED",
      limit: 50,
    }),
    queryFn: () =>
      listPlatformSnapshots({
        page: 1,
        limit: 50,
        status: "PUBLISHED",
      }),
    enabled: open,
  });

  const selectedSnapshot = snapshots?.items.find((s) => s.id === snapshotId);

  const previewResolution = useMemo(
    () =>
      resolveBusinessAccess({
        businessStatus: accessDefaults.businessStatus,
        snapshotId,
        subscription: {
          status: accessDefaults.subscriptionStatus,
          planTierId,
          paymentStatus: accessDefaults.paymentStatus,
          currentPeriodEnd: payment.currentPeriodEnd,
        },
        capabilities:
          tierDefaults?.capabilities ??
          selectedTier?.capabilities?.map((c) => ({
            key: c.key,
            name: c.name,
          })) ??
          [],
        hasPendingOwnerInvite:
          detailsForm.watch("inviteOwner") &&
          accessDefaults.businessStatus !== "ACTIVE",
      }),
    [
      accessDefaults,
      snapshotId,
      planTierId,
      tierDefaults,
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
        snapshotId: snapshotId ?? undefined,
        planGroupId: planGroupId ?? undefined,
        planTierId: planTierId ?? undefined,
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
      toast.success(
        getCreateSuccessToast({
          paymentCollected: payment.paymentCollected,
          unpaidAccessMode: payment.unpaidAccessMode,
          paymentRecorded:
            payment.paymentCollected && amount != null && amount > 0,
        }),
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
    setPlanGroupId(null);
    setPlanTierId(null);
    setSnapshotId(null);
    setSnapshotManuallySet(false);
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
          ? getDefaultTrialEnd(tierDefaults?.trialDays ?? 14)
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
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="mr-2 size-4" />
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
                      description="Optional unless you invite the owner now."
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
                      description="Sends an admin invite to the owner email after the business is created."
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
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Plan group</p>
                    <SearchableSelect
                      items={
                        planGroups?.items.map((g) => ({
                          value: g.id,
                          label: g.name,
                        })) ?? []
                      }
                      value={planGroupId}
                      onValueChange={(v) => {
                        setPlanGroupId(v);
                        setPlanTierId(null);
                        setSnapshotManuallySet(false);
                      }}
                      placeholder="Select plan group"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Plan tier</p>
                    <SearchableSelect
                      items={
                        tiers?.map((t) => ({ value: t.id, label: t.name })) ?? []
                      }
                      value={planTierId}
                      onValueChange={(v) => {
                        setPlanTierId(v);
                        setSnapshotManuallySet(false);
                      }}
                      placeholder="Select plan tier"
                      disabled={!planGroupId}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <p className="text-sm font-medium">Snapshot</p>
                    <SearchableSelect
                      items={
                        snapshots?.items.map((s) => ({
                          value: s.id,
                          label: s.name,
                        })) ?? []
                      }
                      value={snapshotId}
                      onValueChange={(v) => {
                        setSnapshotId(v);
                        setSnapshotManuallySet(true);
                      }}
                      placeholder="Auto-suggested from package"
                    />
                    <p className="text-xs text-muted-foreground">
                      Snapshot controls labels, navigation, and workspace experience.
                      Leave as suggested or pick another published snapshot.
                    </p>
                  </div>
                </div>
                {planGroupId && planTierId ? (
                  <PackageImpactPreview
                    snapshotName={
                      selectedSnapshot?.name ?? tierDefaults?.suggestedSnapshotName
                    }
                    capabilities={tierDefaults?.capabilities ?? []}
                    amount={payment.amount ?? tierDefaults?.amount}
                    currency={payment.currency ?? tierDefaults?.currency}
                    trialDays={tierDefaults?.trialDays}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select a plan group and tier to preview included modules and
                    suggested pricing. You can also continue without a package and
                    configure access later.
                  </p>
                )}
                {selectedGroup && selectedTier ? (
                  <div className="rounded-md border bg-muted/30 p-3 text-sm">
                    <p>
                      <span className="font-medium">Package:</span>{" "}
                      {selectedGroup.name} / {selectedTier.name}
                    </p>
                    <p>
                      <span className="font-medium">Snapshot:</span>{" "}
                      {selectedSnapshot?.name ??
                        tierDefaults?.suggestedSnapshotName ??
                        "Platform default"}
                    </p>
                  </div>
                ) : null}
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
                          Payment received — activate with paid access.
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
                      value={detailsForm.watch("name") || "—"}
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
                      value={detailsForm.watch("inviteOwner") ? "Yes" : "No"}
                    />
                    <SummaryRow
                      label="Package"
                      value={
                        selectedGroup && selectedTier
                          ? `${selectedGroup.name} / ${selectedTier.name}`
                          : "None — configure in Access tab"
                      }
                    />
                    <SummaryRow
                      label="Snapshot"
                      value={
                        selectedSnapshot?.name ??
                        tierDefaults?.suggestedSnapshotName ??
                        "Platform default"
                      }
                    />
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
                              .join(" · ") || "—"
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
              <ChevronLeft className="mr-1 size-4" />
              Back
            </Button>
            {step < MAX_STEP ? (
              <Button type="button" onClick={() => void handleNext()} disabled={!canGoNext()}>
                Next
                <ChevronRight className="ml-1 size-4" />
              </Button>
            ) : (
              <Button
                type="button"
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
              No plan tier is selected. The business will be created without
              package capabilities. You can assign a plan and snapshot later from
              the Access tab.
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
              <Plus className="mr-1.5 size-3.5" />
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
              <Plus className="mr-1.5 size-3.5" />
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
