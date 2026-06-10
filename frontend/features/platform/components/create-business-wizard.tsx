"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { CheckboxField } from "@/components/forms/checkbox-field";
import { PhoneField } from "@/components/forms/phone-field";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { TextField } from "@/components/forms/text-field";
import { StatusBadge } from "@/components/data-display/status-badge";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createPlatformBusiness, listActiveIndustries } from "@/features/platform/api/platform.api";
import {
  getPlatformPlanGroupDefaults,
  getPlatformPlanGroupTierDefaults,
  listPlatformPlanGroups,
  listPlatformPlanGroupTiers,
} from "@/features/platform/api/plan-groups.api";
import { PackageImpactPreview } from "@/features/platform/components/access/package-impact-preview";
import { BusinessAccessSummaryCard } from "@/features/platform/components/access/business-access-summary-card";
import { listPlatformSnapshots } from "@/features/platform/api/snapshots.api";
import type {
  BusinessAccessStatus,
  SubscriptionAccessStatus,
  SubscriptionPaymentMethod,
  SubscriptionPaymentStatus,
} from "@/features/platform/types/business-access";
import {
  applyScenarioDefaults,
  applySubscriptionStatusDefaults,
  CREATE_BUSINESS_SCENARIOS,
  getAccessWarnings,
  getDefaultTrialEnd,
  hasBlockingAccessWarnings,
  toDateInputValue,
  type CreateBusinessScenario,
} from "@/features/platform/utils/business-access-defaults";
import {
  billingCycleOptions,
  businessStatusOptions,
  subscriptionPaymentMethodOptions,
  subscriptionPaymentStatusOptions,
  subscriptionStatusOptions,
} from "@/features/platform/utils/select-options";
import type { BusinessSubscriptionBillingCycle } from "@/features/platform/types/business-subscription";
import {
  computePeriodEndFromBillingCycle,
  formatBillingCycleLabel,
  resolveTierPriceFromStrings,
} from "@/features/platform/utils/tier-price.util";
import {
  buildDisplayName,
  profileFormToApiBody,
  type BusinessProfileFormValues,
} from "@/features/settings/schemas/business-profile";
import { hasPhoneDigits } from "@/lib/forms/phone";
import { countryOptions, timezoneOptions } from "@/lib/config/geo-options";
import { invalidatePlatformBusinesses } from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import { resolveBusinessAccess } from "@/features/platform/utils/business-access-resolver.util";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, title: "Scenario", description: "Choose the onboarding path" },
  { id: 2, title: "Business Details", description: "Workspace and owner contact" },
  { id: 3, title: "Package & Experience", description: "Tier, capabilities, and experience" },
  { id: 4, title: "Billing / Trial", description: "Subscription and payment defaults" },
  { id: 5, title: "Review & Create", description: "Confirm and provision" },
] as const;

const wizardDetailsSchema = z
  .object({
    name: z.string().min(2, "Business name is required").max(200),
    website: z
      .string()
      .max(500)
      .optional()
      .refine(
        (v) => !v || v === "" || /^https?:\/\/.+/i.test(v),
        "Website must start with http:// or https://",
      ),
    phone: z.string().optional(),
    country: z.string().max(100).optional(),
    timezone: z.string().min(1, "Timezone is required"),
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    email: z.string().email("Valid owner email is required").max(255),
    inviteOwner: z.boolean(),
    industryId: z.string().uuid().optional(),
  });

type WizardDetailsValues = z.infer<typeof wizardDetailsSchema>;

const detailsDefaults: WizardDetailsValues = {
  name: "",
  website: "",
  phone: "",
  country: "",
  timezone: "America/New_York",
  firstName: "",
  lastName: "",
  email: "",
  inviteOwner: true,
  industryId: "",
};

interface AccessFormState {
  businessStatus: BusinessAccessStatus;
  subscriptionStatus: SubscriptionAccessStatus;
  paymentMethod: SubscriptionPaymentMethod;
  paymentStatus: SubscriptionPaymentStatus;
  billingCycle: BusinessSubscriptionBillingCycle;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  amount?: string;
  currency?: string;
  notes?: string;
}

function toAccessState(
  defaults: ReturnType<typeof applyScenarioDefaults>,
): AccessFormState {
  return {
    businessStatus: defaults.businessStatus,
    subscriptionStatus: defaults.subscriptionStatus,
    paymentMethod: defaults.paymentMethod,
    paymentStatus: defaults.paymentStatus,
    billingCycle: "MONTHLY",
    currentPeriodStart: defaults.currentPeriodStart,
    currentPeriodEnd: defaults.currentPeriodEnd,
    currency: "USD",
  };
}

export function CreateBusinessWizard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [scenario, setScenario] = useState<CreateBusinessScenario>("trial");
  const [access, setAccess] = useState<AccessFormState>(() =>
    toAccessState(applyScenarioDefaults("trial")),
  );
  const [planGroupId, setPlanGroupId] = useState<string | null>(null);
  const [planTierId, setPlanTierId] = useState<string | null>(null);
  const [snapshotId, setSnapshotId] = useState<string | null>(null);
  const [snapshotManuallySet, setSnapshotManuallySet] = useState(false);
  const [showDraftSnapshots, setShowDraftSnapshots] = useState(false);
  const [customCapabilityMode, setCustomCapabilityMode] = useState(false);

  const router = useRouter();
  const queryClient = useQueryClient();

  const detailsForm = useForm<WizardDetailsValues>({
    resolver: zodResolver(wizardDetailsSchema),
    defaultValues: detailsDefaults,
  });

  const { data: industries } = useQuery({
    queryKey: queryKeys.industries.active(),
    queryFn: () => listActiveIndustries(),
    enabled: open,
  });

  useEffect(() => {
    if (industries?.length && !detailsForm.getValues("industryId")) {
      detailsForm.setValue("industryId", industries[0]!.id);
    }
  }, [industries, detailsForm]);

  const snapshotStatus = showDraftSnapshots ? undefined : "PUBLISHED";

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

  useEffect(() => {
    if (!groupDefaults?.suggestedSnapshotId || snapshotManuallySet) return;
    setSnapshotId(groupDefaults.suggestedSnapshotId);
  }, [groupDefaults, snapshotManuallySet]);

  useEffect(() => {
    if (!tierDefaults || !selectedTier) return;
    const resolved = resolveTierPriceFromStrings(
      selectedTier,
      access.billingCycle,
    );
    setAccess((prev) => {
      const periodStart = prev.currentPeriodStart ?? toDateInputValue(new Date());
      const next: AccessFormState = {
        ...prev,
        amount: resolved != null ? String(resolved) : tierDefaults.amount ?? prev.amount,
        currency: tierDefaults.currency ?? prev.currency,
      };
      if (scenario === "trial" && tierDefaults.trialDays && !prev.currentPeriodEnd) {
        next.currentPeriodEnd = getDefaultTrialEnd(tierDefaults.trialDays);
        next.currentPeriodStart = periodStart;
      } else if (
        prev.subscriptionStatus === "ACTIVE" &&
        prev.billingCycle !== "CUSTOM"
      ) {
        next.currentPeriodStart = periodStart;
        const end = computePeriodEndFromBillingCycle(prev.billingCycle, periodStart);
        if (end) next.currentPeriodEnd = end;
      }
      return next;
    });
    if (!snapshotManuallySet && tierDefaults.suggestedSnapshotId) {
      setSnapshotId(tierDefaults.suggestedSnapshotId);
    }
  }, [tierDefaults, selectedTier, scenario, snapshotManuallySet, access.billingCycle]);

  const { data: snapshots } = useQuery({
    queryKey: queryKeys.platform.snapshots.list({
      status: snapshotStatus ?? "all",
      limit: 50,
    }),
    queryFn: () =>
      listPlatformSnapshots({
        page: 1,
        limit: 50,
        status: snapshotStatus,
      }),
    enabled: open,
  });

  const selectedScenario = CREATE_BUSINESS_SCENARIOS.find((s) => s.value === scenario);

  const warnings = useMemo(
    () =>
      getAccessWarnings({
        businessStatus: access.businessStatus,
        subscriptionStatus: access.subscriptionStatus,
        paymentMethod: access.paymentMethod,
        paymentStatus: access.paymentStatus,
        planTierId,
        currentPeriodEnd: access.currentPeriodEnd,
      }),
    [access, planTierId],
  );

  const blockingWarnings = hasBlockingAccessWarnings({
    subscriptionStatus: access.subscriptionStatus,
    currentPeriodEnd: access.currentPeriodEnd,
  });

  const previewResolution = useMemo(
    () =>
      resolveBusinessAccess({
        businessStatus: access.businessStatus,
        snapshotId,
        subscription: {
          status: access.subscriptionStatus,
          planTierId,
          paymentStatus: access.paymentStatus,
          currentPeriodEnd: access.currentPeriodEnd,
        },
        capabilities:
          tierDefaults?.capabilities ??
          selectedTier?.capabilities?.map((c) => ({
            key: c.key,
            name: c.name,
          })) ??
          [],
        hasPendingOwnerInvite:
          detailsForm.watch("inviteOwner") && access.businessStatus !== "ACTIVE",
      }),
    [access, snapshotId, planTierId, tierDefaults, selectedTier, detailsForm],
  );

  const previewAccess = useMemo(
    () => ({
      businessId: "preview",
      businessStatus: access.businessStatus,
      snapshotId,
      snapshotName:
        snapshots?.items.find((s) => s.id === snapshotId)?.name ?? null,
      subscription: {
        id: "preview",
        status: access.subscriptionStatus,
        planTierId,
        planTierName: selectedTier?.name ?? null,
        paymentMethod: access.paymentMethod,
        paymentStatus: access.paymentStatus,
        currentPeriodEnd: access.currentPeriodEnd,
        createdAt: "",
        updatedAt: "",
      },
      capabilities: [],
      resolution: previewResolution,
    }),
    [
      access,
      snapshotId,
      snapshots,
      planTierId,
      selectedTier,
      previewResolution,
    ],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const details = detailsForm.getValues();
      const profileValues: BusinessProfileFormValues = {
        name: details.name,
        firstName: details.firstName?.trim() || "Owner",
        lastName: details.lastName?.trim() || "Contact",
        displayName:
          buildDisplayName(details.firstName, details.lastName) || "Owner Contact",
        email: details.email.trim(),
        industryId: details.industryId || industries?.[0]?.id || "",
        phone: hasPhoneDigits(details.phone ?? "") ? details.phone! : "+12025550100",
        country: details.country,
        website: details.website,
        timezone: details.timezone,
        taxesAndCurrency: {
          currencyCode: access.currency || "USD",
          defaultTaxRate: 0,
          pricesIncludeTax: false,
        },
        address: "",
        addressLine2: "",
        city: "",
        state: "",
        zip: "",
        logoUrl: "",
        snapshotId: snapshotId ?? "",
      };
      const profile = profileFormToApiBody(profileValues);

      return createPlatformBusiness({
        ...profile,
        snapshotId: snapshotId ?? profile.snapshotId,
        status: access.businessStatus,
        planGroupId: planGroupId ?? undefined,
        planTierId: planTierId ?? undefined,
        subscriptionStatus: access.subscriptionStatus,
        paymentMethod: access.paymentMethod,
        paymentStatus: access.paymentStatus,
        billingCycle:
          access.subscriptionStatus === "INTERNAL"
            ? undefined
            : access.billingCycle,
        currentPeriodStart: access.currentPeriodStart || undefined,
        currentPeriodEnd: access.currentPeriodEnd || undefined,
        amount: access.amount ? Number(access.amount) : undefined,
        currency: access.currency || undefined,
        notes: access.notes || undefined,
        syncCapabilitiesFromTier: Boolean(planTierId) && !customCapabilityMode,
        inviteOwner: details.inviteOwner && Boolean(details.email?.trim()),
      });
    },
    onSuccess: (business) => {
      toast.success("Business created");
      void invalidatePlatformBusinesses(queryClient);
      setOpen(false);
      resetWizard();
      router.push(`/platform/businesses/${business.id}?tab=access`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleScenarioChange = (value: CreateBusinessScenario) => {
    setScenario(value);
    setAccess(toAccessState(applyScenarioDefaults(value)));
    if (value === "custom") {
      setCustomCapabilityMode(true);
    }
  };

  const handleSubscriptionStatusChange = (
    value: AccessFormState["subscriptionStatus"],
  ) => {
    const defaults = applySubscriptionStatusDefaults(value);
    setAccess((prev) => ({
      ...prev,
      subscriptionStatus: value,
      businessStatus: defaults.businessStatus,
      paymentMethod: defaults.paymentMethod,
      paymentStatus: defaults.paymentStatus,
      ...(value === "TRIALING" && !prev.currentPeriodEnd
        ? {
            currentPeriodStart: toDateInputValue(new Date()),
            currentPeriodEnd: getDefaultTrialEnd(14),
          }
        : {}),
    }));
  };

  const resetWizard = () => {
    setStep(1);
    setScenario("trial");
    setAccess(toAccessState(applyScenarioDefaults("trial")));
    setPlanGroupId(null);
    setPlanTierId(null);
    setSnapshotId(null);
    setSnapshotManuallySet(false);
    setShowDraftSnapshots(false);
    setCustomCapabilityMode(false);
    detailsForm.reset(detailsDefaults);
  };

  const canGoNext = () => {
    if (step === 2) return Boolean(detailsForm.watch("name")?.trim());
    if (step === 4 && blockingWarnings) return false;
    return true;
  };

  const handleNext = async () => {
    if (step === 2) {
      const valid = await detailsForm.trigger();
      if (!valid) return;
    }
    if (!canGoNext()) return;
    setStep((s) => Math.min(5, s + 1));
  };

  const subscriptionStatusItems = subscriptionStatusOptions.filter(
    (o) => o.value !== "PAST_DUE",
  );

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
              Step {step} of 5 · {STEPS[step - 1]?.title}
            </p>

            {step === 1 ? (
              <OptionCards
                options={CREATE_BUSINESS_SCENARIOS}
                value={scenario}
                onChange={(v) => handleScenarioChange(v as CreateBusinessScenario)}
              />
            ) : null}

            {step === 2 ? (
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
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Industry</p>
                    <SearchableSelect
                      items={
                        industries?.map((i) => ({ value: i.id, label: i.name })) ?? []
                      }
                      value={detailsForm.watch("industryId") || null}
                      onValueChange={(v) =>
                        v &&
                        detailsForm.setValue("industryId", v, { shouldDirty: true })
                      }
                      placeholder="Select industry"
                    />
                  </div>
                  <TextField
                    control={detailsForm.control}
                    name="website"
                    label="Website"
                    placeholder="https://example.com"
                  />
                  <PhoneField
                    control={detailsForm.control}
                    name="phone"
                    label="Phone"
                  />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Country</p>
                    <SearchableSelect
                      items={countryOptions}
                      value={detailsForm.watch("country") || null}
                      onValueChange={(v) =>
                        detailsForm.setValue("country", v ?? "", { shouldDirty: true })
                      }
                      placeholder="Select country"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Timezone</p>
                    <SearchableSelect
                      items={timezoneOptions}
                      value={detailsForm.watch("timezone")}
                      onValueChange={(v) =>
                        v &&
                        detailsForm.setValue("timezone", v, { shouldDirty: true })
                      }
                      placeholder="Select timezone"
                    />
                  </div>
                  <TextField
                    control={detailsForm.control}
                    name="firstName"
                    label="Owner first name"
                  />
                  <TextField
                    control={detailsForm.control}
                    name="lastName"
                    label="Owner last name"
                  />
                  <div className="sm:col-span-2">
                    <TextField
                      control={detailsForm.control}
                      name="email"
                      label="Owner email"
                      type="email"
                      placeholder="owner@company.com"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <CheckboxField
                      control={detailsForm.control}
                      name="inviteOwner"
                      label="Invite owner to workspace"
                      description="Sends an admin invite to the owner email after the business is created."
                    />
                    {detailsForm.watch("inviteOwner") &&
                    access.businessStatus !== "ACTIVE" ? (
                      <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                        Owner will be invited while the workspace is not active. They
                        cannot sign in until access is granted.
                      </p>
                    ) : null}
                  </div>
                </div>
              </Form>
            ) : null}

            {step === 3 ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Plan group</p>
                    <SearchableSelect
                      items={
                        planGroups?.items.map((g) => ({ value: g.id, label: g.name })) ?? []
                      }
                      value={planGroupId}
                      onValueChange={(v) => {
                        setPlanGroupId(v);
                        setPlanTierId(null);
                      }}
                      placeholder="Select plan group"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Plan tier</p>
                    <SearchableSelect
                      items={tiers?.map((t) => ({ value: t.id, label: t.name })) ?? []}
                      value={planTierId}
                      onValueChange={setPlanTierId}
                      placeholder="Select plan tier"
                      disabled={!planGroupId}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">Snapshot</p>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="show-drafts" className="text-xs text-muted-foreground">
                          Show drafts
                        </Label>
                        <Switch
                          id="show-drafts"
                          checked={showDraftSnapshots}
                          onCheckedChange={setShowDraftSnapshots}
                        />
                      </div>
                    </div>
                    <SearchableSelect
                      items={
                        snapshots?.items.map((s) => ({ value: s.id, label: s.name })) ?? []
                      }
                      value={snapshotId}
                      onValueChange={(v) => {
                        setSnapshotId(v);
                        setSnapshotManuallySet(true);
                      }}
                      placeholder="Select snapshot"
                    />
                  </div>
                </div>
                {planGroupId && planTierId ? (
                  <PackageImpactPreview
                    snapshotName={
                      snapshots?.items.find((s) => s.id === snapshotId)?.name ??
                      tierDefaults?.suggestedSnapshotName
                    }
                    capabilities={tierDefaults?.capabilities ?? []}
                    amount={tierDefaults?.amount ?? access.amount}
                    currency={tierDefaults?.currency ?? access.currency}
                    trialDays={tierDefaults?.trialDays}
                  />
                ) : null}
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">Custom capability override</p>
                    <p className="text-xs text-muted-foreground">
                      Skip auto-sync on create and configure capabilities manually later.
                    </p>
                  </div>
                  <Switch
                    checked={customCapabilityMode}
                    onCheckedChange={setCustomCapabilityMode}
                  />
                </div>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="space-y-4">
                {selectedScenario ? (
                  <div className="rounded-md border bg-muted/30 p-3 text-sm">
                    <span className="font-medium">Scenario: </span>
                    {selectedScenario.label} — {selectedScenario.summary}
                  </div>
                ) : null}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Business status</p>
                    <SearchableSelect
                      items={businessStatusOptions}
                      value={access.businessStatus}
                      onValueChange={(v) =>
                        v &&
                        setAccess((prev) => ({
                          ...prev,
                          businessStatus: v as BusinessAccessStatus,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Subscription status</p>
                    <SearchableSelect
                      items={subscriptionStatusItems}
                      value={access.subscriptionStatus}
                      onValueChange={(v) =>
                        v && handleSubscriptionStatusChange(v as AccessFormState["subscriptionStatus"])
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Payment method</p>
                    <SearchableSelect
                      items={subscriptionPaymentMethodOptions}
                      value={access.paymentMethod}
                      onValueChange={(v) =>
                        v &&
                        setAccess((prev) => ({
                          ...prev,
                          paymentMethod: v as SubscriptionPaymentMethod,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Payment status</p>
                    <SearchableSelect
                      items={subscriptionPaymentStatusOptions}
                      value={access.paymentStatus}
                      onValueChange={(v) =>
                        v &&
                        setAccess((prev) => ({
                          ...prev,
                          paymentStatus: v as SubscriptionPaymentStatus,
                        }))
                      }
                    />
                  </div>
                  {access.subscriptionStatus !== "INTERNAL" ? (
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Billing cycle</p>
                      <SearchableSelect
                        items={billingCycleOptions}
                        value={access.billingCycle}
                        onValueChange={(v) => {
                          if (!v) return;
                          const cycle = v as BusinessSubscriptionBillingCycle;
                          setAccess((prev) => {
                            const start =
                              prev.currentPeriodStart ?? toDateInputValue(new Date());
                            const resolved = selectedTier
                              ? resolveTierPriceFromStrings(selectedTier, cycle)
                              : null;
                            const end =
                              prev.subscriptionStatus === "TRIALING"
                                ? prev.currentPeriodEnd
                                : cycle === "CUSTOM"
                                  ? prev.currentPeriodEnd
                                  : computePeriodEndFromBillingCycle(cycle, start) ??
                                    prev.currentPeriodEnd;
                            return {
                              ...prev,
                              billingCycle: cycle,
                              currentPeriodStart: start,
                              currentPeriodEnd: end ?? prev.currentPeriodEnd,
                              amount:
                                resolved != null ? String(resolved) : prev.amount,
                            };
                          });
                        }}
                      />
                    </div>
                  ) : null}
                  {planTierId && access.subscriptionStatus !== "INTERNAL" ? (
                    <div className="space-y-1 sm:col-span-2 rounded-md border bg-muted/30 p-3 text-sm">
                      <p>
                        <span className="font-medium">Selected tier:</span>{" "}
                        {selectedTier?.name ?? "—"}
                      </p>
                      <p>
                        <span className="font-medium">Billing cycle:</span>{" "}
                        {formatBillingCycleLabel(access.billingCycle)}
                      </p>
                      <p>
                        <span className="font-medium">Price:</span>{" "}
                        {access.amount
                          ? `${access.amount} ${access.currency ?? "USD"}`
                          : "Not set"}
                        {access.billingCycle === "MONTHLY"
                          ? " / month"
                          : access.billingCycle === "YEARLY"
                            ? " / year"
                            : ""}
                      </p>
                      {access.currentPeriodEnd ? (
                        <p>
                          <span className="font-medium">
                            {access.subscriptionStatus === "TRIALING"
                              ? "Trial ends"
                              : "Next billing date"}
                            :
                          </span>{" "}
                          {new Date(access.currentPeriodEnd).toLocaleDateString()}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Period start</p>
                    <Input
                      type="date"
                      value={access.currentPeriodStart ?? ""}
                      onChange={(e) =>
                        setAccess((prev) => ({
                          ...prev,
                          currentPeriodStart: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Period end</p>
                    <Input
                      type="date"
                      value={access.currentPeriodEnd ?? ""}
                      onChange={(e) =>
                        setAccess((prev) => ({
                          ...prev,
                          currentPeriodEnd: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Amount</p>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={access.amount ?? ""}
                      onChange={(e) =>
                        setAccess((prev) => ({ ...prev, amount: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Currency</p>
                    <Input
                      value={access.currency ?? "USD"}
                      onChange={(e) =>
                        setAccess((prev) => ({
                          ...prev,
                          currency: e.target.value.toUpperCase(),
                        }))
                      }
                      maxLength={3}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <p className="text-sm font-medium">Notes</p>
                    <Textarea
                      value={access.notes ?? ""}
                      onChange={(e) =>
                        setAccess((prev) => ({ ...prev, notes: e.target.value }))
                      }
                      rows={3}
                    />
                  </div>
                </div>
                {warnings.length ? (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-sm text-amber-900 dark:text-amber-200">
                    {warnings.map((w) => (
                      <p key={w}>{w}</p>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === 5 ? (
              <div className="space-y-4">
                <BusinessAccessSummaryCard access={previewAccess} compact />
              <Card>
                <CardContent className="space-y-3 pt-6 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {detailsForm.watch("name") || "—"}
                    </span>
                    <StatusBadge status={access.businessStatus} domain="business" />
                    <StatusBadge status={access.subscriptionStatus} domain="subscription" />
                    <StatusBadge status={access.paymentStatus} domain="subscriptionPayment" />
                  </div>
                  <SummaryRow
                    label="Scenario"
                    value={selectedScenario?.label ?? "—"}
                  />
                  <SummaryRow
                    label="Owner"
                    value={
                      [
                        detailsForm.watch("firstName"),
                        detailsForm.watch("lastName"),
                      ]
                        .filter(Boolean)
                        .join(" ") || "—"
                    }
                  />
                  <SummaryRow
                    label="Owner email"
                    value={detailsForm.watch("email") || "—"}
                  />
                  <SummaryRow
                    label="Invite owner"
                    value={detailsForm.watch("inviteOwner") ? "Yes" : "No"}
                  />
                  <SummaryRow
                    label="Plan"
                    value={`${planGroups?.items.find((g) => g.id === planGroupId)?.name ?? "—"} / ${selectedTier?.name ?? "—"}`}
                  />
                  <SummaryRow
                    label="Snapshot"
                    value={
                      snapshots?.items.find((s) => s.id === snapshotId)?.name ?? "—"
                    }
                  />
                  <SummaryRow
                    label="Trial period"
                    value={`${access.currentPeriodStart || "—"} → ${access.currentPeriodEnd || "—"}`}
                  />
                  <SummaryRow
                    label="Capabilities"
                    value={
                      customCapabilityMode
                        ? "Manual configuration"
                        : `${selectedTier?.capabilities?.length ?? 0} from tier`
                    }
                  />
                  {warnings.length ? (
                    <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-amber-900 dark:text-amber-200">
                      {warnings.map((w) => (
                        <p key={w}>{w}</p>
                      ))}
                    </div>
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
            {step < 5 ? (
              <Button type="button" onClick={() => void handleNext()} disabled={!canGoNext()}>
                Next
                <ChevronRight className="ml-1 size-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || blockingWarnings}
              >
                {mutation.isPending ? "Creating…" : "Create business"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function OptionCards({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string; description: string; summary?: string }[];
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
          {option.summary ? (
            <p className="mt-1 text-xs text-muted-foreground">{option.summary}</p>
          ) : null}
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
