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
import {
  CREATE_ACCESS_OPTIONS,
  deriveAccessFromPaymentChoice,
  getAccessWarnings,
  getBrowserTimezone,
  getCreateSuccessToast,
  getDefaultTrialEnd,
  hasBlockingCreateAccessWarnings,
  isTrialDateRangeValid,
  splitFullName,
  toDateInputValue,
} from "@/features/platform/utils/business-access-defaults";
import {
  formatBusinessStatus,
  formatSubscriptionStatus,
} from "@/features/platform/utils/access-labels";
import { hasPhoneDigits, phoneToApiFields } from "@/lib/forms/phone";
import { invalidatePlatformBusinesses } from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import { resolveBusinessAccess } from "@/features/platform/utils/business-access-resolver.util";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, title: "Business", description: "Name and owner contact" },
  { id: 2, title: "Access", description: "Trial or internal access" },
  { id: 3, title: "Package", description: "Plan group, tier, and experience" },
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

type CreateAccessMode = "TRIAL" | "INTERNAL";

interface AccessFormState {
  accessMode: CreateAccessMode;
  trialStart: string;
  trialEnd: string;
  notes?: string;
}

const accessDefaults: AccessFormState = {
  accessMode: "TRIAL",
  trialStart: toDateInputValue(new Date()),
  trialEnd: getDefaultTrialEnd(14),
};

export function CreateBusinessWizard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [skipPackageOpen, setSkipPackageOpen] = useState(false);
  const [planGroupId, setPlanGroupId] = useState<string | null>(null);
  const [planTierId, setPlanTierId] = useState<string | null>(null);
  const [snapshotId, setSnapshotId] = useState<string | null>(null);
  const [snapshotManuallySet, setSnapshotManuallySet] = useState(false);
  const [access, setAccess] = useState<AccessFormState>(accessDefaults);
  const [showNotesField, setShowNotesField] = useState(false);

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

  useEffect(() => {
    if (access.accessMode !== "TRIAL" || !tierDefaults?.trialDays) return;
    setAccess((prev) => ({
      ...prev,
      trialEnd: getDefaultTrialEnd(tierDefaults.trialDays ?? 14),
    }));
  }, [access.accessMode, tierDefaults?.trialDays]);

  const accessResolution = useMemo(
    () =>
      deriveAccessFromPaymentChoice({
        paymentCollected: false,
        unpaidAccessMode: access.accessMode,
      }),
    [access.accessMode],
  );

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

  const capabilities = useMemo(
    () =>
      tierDefaults?.capabilities ??
      selectedTier?.capabilities?.map((c) => ({
        key: c.key,
        name: c.name,
      })) ??
      [],
    [tierDefaults?.capabilities, selectedTier?.capabilities],
  );

  const tierPriceSummary = useMemo(() => {
    if (!selectedTier) return null;
    const parts: string[] = [];
    if (selectedTier.priceMonthly) {
      parts.push(`${selectedTier.priceMonthly} ${tierDefaults?.currency ?? "USD"}/month`);
    }
    if (selectedTier.priceYearly) {
      parts.push(`${selectedTier.priceYearly} ${tierDefaults?.currency ?? "USD"}/year`);
    }
    if (selectedTier.setupFee) {
      parts.push(`${selectedTier.setupFee} ${tierDefaults?.currency ?? "USD"} setup`);
    }
    return parts.length > 0 ? parts.join(" · ") : null;
  }, [selectedTier, tierDefaults?.currency]);

  const previewResolution = useMemo(
    () =>
      resolveBusinessAccess({
        businessStatus: accessResolution.businessStatus,
        snapshotId,
        subscription: {
          status: accessResolution.subscriptionStatus,
          planTierId,
          paymentStatus: accessResolution.paymentStatus,
          currentPeriodEnd:
            access.accessMode === "TRIAL" ? access.trialEnd : undefined,
        },
        capabilities,
        hasPendingOwnerInvite:
          detailsForm.watch("inviteOwner") &&
          accessResolution.businessStatus !== "ACTIVE",
      }),
    [
      accessResolution,
      snapshotId,
      planTierId,
      access.accessMode,
      access.trialEnd,
      capabilities,
      detailsForm,
    ],
  );

  const warnings = useMemo(
    () =>
      getAccessWarnings({
        businessStatus: accessResolution.businessStatus,
        subscriptionStatus: accessResolution.subscriptionStatus,
        paymentStatus: accessResolution.paymentStatus,
        planTierId,
        currentPeriodEnd: access.accessMode === "TRIAL" ? access.trialEnd : null,
        paymentCollected: false,
        unpaidAccessMode: access.accessMode,
      }),
    [accessResolution, access, planTierId],
  );

  const blockingWarnings = hasBlockingCreateAccessWarnings({
    accessMode: access.accessMode,
    trialStart: access.trialStart,
    trialEnd: access.trialEnd,
  });

  const trialDateError =
    access.accessMode === "TRIAL" &&
    access.trialStart &&
    access.trialEnd &&
    !isTrialDateRangeValid(access.trialStart, access.trialEnd)
      ? "Trial end date must be after trial start date."
      : null;

  const selectedAccessLabel =
    CREATE_ACCESS_OPTIONS.find((o) => o.value === access.accessMode)?.label ??
    access.accessMode;

  const mutation = useMutation({
    mutationFn: async () => {
      const details = detailsForm.getValues();
      const { firstName, lastName } = splitFullName(details.fullName);
      const phoneFields = hasPhoneDigits(details.phone ?? "")
        ? phoneToApiFields(details.phone!)
        : {};

      return createPlatformBusiness({
        name: details.name.trim(),
        firstName,
        lastName,
        displayName: details.fullName?.trim() || undefined,
        email: details.email?.trim() || undefined,
        ...phoneFields,
        timezone: getBrowserTimezone(),
        taxesAndCurrency: {
          currencyCode: tierDefaults?.currency ?? "USD",
          defaultTaxRate: 0,
          pricesIncludeTax: false,
        },
        snapshotId: snapshotId ?? undefined,
        planGroupId: planGroupId ?? undefined,
        planTierId: planTierId ?? undefined,
        unpaidAccessMode: access.accessMode,
        paymentCollected: false,
        currentPeriodStart:
          access.accessMode === "TRIAL" ? access.trialStart : undefined,
        currentPeriodEnd:
          access.accessMode === "TRIAL" ? access.trialEnd : undefined,
        notes: access.notes || undefined,
        syncCapabilitiesFromTier: Boolean(planTierId),
        inviteOwner: details.inviteOwner && Boolean(details.email?.trim()),
      });
    },
    onSuccess: (business) => {
      toast.success(
        getCreateSuccessToast({
          paymentCollected: false,
          unpaidAccessMode: access.accessMode,
        }),
      );
      void invalidatePlatformBusinesses(queryClient);
      setOpen(false);
      resetWizard();
      router.push(`/platform/businesses/${business.id}?tab=subscriptions`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetWizard = () => {
    setStep(1);
    setPlanGroupId(null);
    setPlanTierId(null);
    setSnapshotId(null);
    setSnapshotManuallySet(false);
    setAccess({
      ...accessDefaults,
      trialStart: toDateInputValue(new Date()),
      trialEnd: getDefaultTrialEnd(14),
    });
    setShowNotesField(false);
    detailsForm.reset(detailsDefaults);
  };

  const handleAccessModeChange = (mode: CreateAccessMode) => {
    setAccess((prev) => ({
      ...prev,
      accessMode: mode,
      trialStart: prev.trialStart || toDateInputValue(new Date()),
      trialEnd:
        mode === "TRIAL"
          ? prev.trialEnd || getDefaultTrialEnd(tierDefaults?.trialDays ?? 14)
          : prev.trialEnd,
    }));
  };

  const canGoNext = () => {
    if (step === 1) return Boolean(detailsForm.watch("name")?.trim());
    if (step === 2) return !blockingWarnings && !trialDateError;
    return true;
  };

  const handleNext = async () => {
    if (step === 1) {
      const valid = await detailsForm.trigger();
      if (!valid) return;
    }
    if (step === 3 && !planTierId) {
      setSkipPackageOpen(true);
      return;
    }
    if (step === 2 && (blockingWarnings || trialDateError)) return;
    if (!canGoNext()) return;
    setStep((s) => Math.min(MAX_STEP, s + 1));
  };

  const handleCreate = async () => {
    const valid = await detailsForm.trigger();
    if (!valid || blockingWarnings || trialDateError) return;
    mutation.mutate();
  };

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
                    {inviteOwner && accessResolution.businessStatus !== "ACTIVE" ? (
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
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Access type</p>
                  <p className="text-sm text-muted-foreground">
                    Paid billing is configured later from the Subscription tab or
                    Stripe checkout.
                  </p>
                  <OptionCards
                    options={CREATE_ACCESS_OPTIONS}
                    value={access.accessMode}
                    onChange={(v) => handleAccessModeChange(v as CreateAccessMode)}
                  />
                </div>

                {access.accessMode === "TRIAL" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Trial start date</p>
                      <Input
                        type="date"
                        value={access.trialStart}
                        onChange={(e) =>
                          setAccess((prev) => ({
                            ...prev,
                            trialStart: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Trial end date</p>
                      <Input
                        type="date"
                        value={access.trialEnd}
                        onChange={(e) =>
                          setAccess((prev) => ({
                            ...prev,
                            trialEnd: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                ) : null}

                {access.accessMode === "INTERNAL" || showNotesField ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">Notes (optional)</p>
                      {showNotesField ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            setAccess((prev) => ({ ...prev, notes: "" }));
                            setShowNotesField(false);
                          }}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                    {showNotesField ? (
                      <Textarea
                        value={access.notes ?? ""}
                        onChange={(e) =>
                          setAccess((prev) => ({ ...prev, notes: e.target.value }))
                        }
                        rows={2}
                      />
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowNotesField(true)}
                      >
                        <Plus className="mr-1.5 size-3.5" />
                        Add notes
                      </Button>
                    )}
                  </div>
                ) : null}

                {trialDateError ? (
                  <p className="text-sm text-destructive">{trialDateError}</p>
                ) : null}

                {warnings.length ? (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-sm text-amber-900 dark:text-amber-200">
                    {warnings.map((w) => (
                      <p key={w}>{w}</p>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === 3 ? (
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
                  <>
                    <PackageImpactPreview
                      snapshotName={
                        selectedSnapshot?.name ?? tierDefaults?.suggestedSnapshotName
                      }
                      capabilities={tierDefaults?.capabilities ?? []}
                      trialDays={tierDefaults?.trialDays}
                    />
                    {tierPriceSummary ? (
                      <p className="text-sm text-muted-foreground">
                        This price will be used when the business subscribes to a
                        paid plan: {tierPriceSummary}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select a plan group and tier to preview included modules. You can
                    also continue without a package and configure access later.
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
                    <SummaryRow label="Access type" value={selectedAccessLabel} />
                    {access.accessMode === "TRIAL" ? (
                      <>
                        <SummaryRow
                          label="Trial start"
                          value={formatDisplayDate(access.trialStart)}
                        />
                        <SummaryRow
                          label="Trial end"
                          value={formatDisplayDate(access.trialEnd)}
                        />
                      </>
                    ) : null}
                    <SummaryRow
                      label="Package"
                      value={
                        selectedGroup && selectedTier
                          ? `${selectedGroup.name} / ${selectedTier.name}`
                          : "None — configure in Subscriptions tab"
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
                      label="Capabilities"
                      value={
                        capabilities.length > 0
                          ? `${capabilities.length} module${capabilities.length === 1 ? "" : "s"}`
                          : planTierId
                            ? "0 modules"
                            : "None until package is assigned"
                      }
                    />
                    <SummaryRow
                      label="Workspace"
                      value={formatBusinessStatus(accessResolution.businessStatus)}
                    />
                    <SummaryRow
                      label="Subscription"
                      value={formatSubscriptionStatus(
                        accessResolution.subscriptionStatus,
                      )}
                    />
                    <SummaryRow
                      label="Payment"
                      value="No payment will be collected during creation"
                    />
                    <SummaryRow
                      label="Workspace access"
                      value={
                        previewResolution.canAccessWorkspace
                          ? "Yes — can access"
                          : `No — ${previewResolution.reasonLabel}`
                      }
                    />
                    {access.notes?.trim() ? (
                      <SummaryRow label="Notes" value={access.notes.trim()} />
                    ) : null}
                    <p className="border-t pt-3 text-xs text-muted-foreground">
                      Paid billing is configured later from the Subscription tab or
                      Stripe checkout.
                    </p>
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
                disabled={mutation.isPending || blockingWarnings || Boolean(trialDateError)}
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
              the Subscriptions tab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setSkipPackageOpen(false);
                setStep(4);
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
