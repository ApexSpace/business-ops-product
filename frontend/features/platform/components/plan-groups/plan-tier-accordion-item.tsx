"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Form, FormSchemaProvider } from "@/components/ui/form";
import {
  deletePlatformPlanTier,
} from "@/features/platform/api/plan-groups.api";
import {
  createPlanTierSchema,
  type CreatePlanTierValues,
} from "@/features/platform/schemas/plan-group-form";
import type {
  PlanTier,
  TierCapability,
  TierFeatureInput,
} from "@/features/platform/types/plan-group";
import { queryKeys } from "@/lib/query/keys";
import { PlanTierCapabilityField } from "./plan-tier-meta-fields";
import {
  parseTierStripeFormValues,
  PlanTierStripeFields,
  stripeFormValuesToMetadata,
  type PlanTierStripeFormValues,
} from "./plan-tier-stripe-fields";
import { PlanTierFormFields } from "./plan-tier-form-fields";
import {
  buildPreviewTier,
  emptyTierValues,
  formatTierPriceSummary,
  resolveTierCapabilityId,
  tierToFeatureInputs,
  tierToFormValues,
} from "./plan-tier-form.utils";
import { PlanTierFeaturesField } from "./plan-tier-features-field";
import { TierAccordionPreview } from "./tier-accordion-preview";
import { usePreviewCapabilities } from "./use-preview-capabilities";
import type {
  PlanTierDesignSettings,
  ResolvedPlanGroupDesignSettings,
} from "@/features/platform/types/plan-design-settings";

type TierPreviewContext = {
  designSettings: ResolvedPlanGroupDesignSettings;
  currency: string;
  billingCycles: string[];
  defaultCtaLabel?: string | null;
  defaultCtaUrl?: string | null;
};
export type ExistingTierEditorHandle = {
  validate: () => Promise<boolean>;
  getPayload: () => {
    values: CreatePlanTierValues;
    capabilityIds: string[];
    originalCapabilities: TierCapability[];
    features: TierFeatureInput[];
    designSettings: PlanTierDesignSettings;
    stripeMetadata: Record<string, unknown>;
  };
};

export type DraftTierEditorHandle = {
  validate: () => Promise<boolean>;
  getPayload: () => {
    values: CreatePlanTierValues;
    capabilityIds: string[];
    features: TierFeatureInput[];
    designSettings: PlanTierDesignSettings;
    stripeMetadata: Record<string, unknown>;
  };
};

type PendingCapability = {
  id: string;
  name: string;
  key: string;
};

type PlanTierAccordionItemProps = {
  planGroupId: string;
  tier: PlanTier;
  canManage: boolean;
  disabled?: boolean;
  previewContext: TierPreviewContext;
  snapshotId?: string | null;
};

export const PlanTierAccordionItem = forwardRef<
  ExistingTierEditorHandle,
  PlanTierAccordionItemProps
>(function PlanTierAccordionItem(
  { planGroupId, tier, canManage, disabled = false, previewContext, snapshotId },
  ref,
) {
  const queryClient = useQueryClient();
  const [capabilities, setCapabilities] = useState(tier.capabilities);
  const [features, setFeatures] = useState<TierFeatureInput[]>(
    tierToFeatureInputs(tier),
  );
  const [designSettings, setDesignSettings] = useState<PlanTierDesignSettings>(
    tier.designSettings ?? {},
  );
  const [stripeValues, setStripeValues] = useState<PlanTierStripeFormValues>(
    () => parseTierStripeFormValues(tier.metadata),
  );

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.platform.planGroups.tiers(planGroupId),
    });

  const form = useForm<CreatePlanTierValues>({
    resolver: zodResolver(createPlanTierSchema),
    values: tierToFormValues(tier),
  });

  const watchedValues = useWatch({ control: form.control });
  const previewFormValues = useMemo(
    () => ({
      ...tierToFormValues(tier),
      ...(watchedValues ?? {}),
    }),
    [watchedValues, tier],
  );
  const previewCapabilities = usePreviewCapabilities(capabilities);
  const previewTier = useMemo(
    () =>
      buildPreviewTier(
        previewFormValues,
        features,
        capabilities,
        designSettings,
        {
          slug: tier.slug,
          defaultCtaLabel: previewContext.defaultCtaLabel,
          defaultCtaUrl: previewContext.defaultCtaUrl,
          capabilities: previewCapabilities,
        },
      ),
    [
      previewFormValues,
      features,
      capabilities,
      designSettings,
      previewCapabilities,
      previewContext.defaultCtaLabel,
      previewContext.defaultCtaUrl,
      tier.slug,
    ],
  );

  useEffect(() => {
    setCapabilities(tier.capabilities);
    setFeatures(tierToFeatureInputs(tier));
    setDesignSettings(tier.designSettings ?? {});
  }, [tier]);

  useImperativeHandle(ref, () => ({
    validate: () => form.trigger(),
    getPayload: () => ({
      values: form.getValues(),
      capabilityIds: capabilities
        .map(resolveTierCapabilityId)
        .filter(Boolean),
      originalCapabilities: tier.capabilities,
      features,
      designSettings,
      stripeMetadata: stripeFormValuesToMetadata(stripeValues),
    }),
  }));

  const deleteMutation = useMutation({
    mutationFn: () => deletePlatformPlanTier(planGroupId, tier.id),
    onSuccess: () => {
      toast.success("Tier deleted");
      void invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const fieldsDisabled = !canManage || disabled;

  return (
    <AccordionItem value={tier.id} className="border-b px-4 last:border-b-0">
      <AccordionTrigger className="items-center py-4 hover:no-underline">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-left">
          <span className="font-medium">{tier.name}</span>
          {tier.badge ? (
            <Badge variant="secondary" className="text-xs">
              {tier.badge}
            </Badge>
          ) : null}
          <span className="text-xs text-muted-foreground">
            {formatTierPriceSummary(tier)}
          </span>
          {(tier.features?.length ?? 0) > 0 ? (
            <span className="text-xs text-muted-foreground">
              · {tier.features.length} feature
              {tier.features.length === 1 ? "" : "s"}
            </span>
          ) : null}
          {tier.capabilities.length > 0 ? (
            <span className="text-xs text-muted-foreground">
              · {tier.capabilities.length} capabilit
              {tier.capabilities.length === 1 ? "y" : "ies"}
            </span>
          ) : null}
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-4">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
          <div className="min-w-0 space-y-4">
            <Form {...form}>
              <FormSchemaProvider schema={createPlanTierSchema}>
                <div className="space-y-4">
                  <PlanTierFormFields
                    control={form.control}
                    disabled={fieldsDisabled}
                    cardBackgroundColor={designSettings.cardBackgroundColor}
                    onCardBackgroundColorChange={(cardBackgroundColor) =>
                      setDesignSettings((prev) => {
                        const next = { ...prev };
                        if (cardBackgroundColor.trim()) {
                          next.cardBackgroundColor = cardBackgroundColor;
                        } else {
                          delete next.cardBackgroundColor;
                        }
                        return next;
                      })
                    }
                  />
                </div>
              </FormSchemaProvider>
            </Form>

            <PlanTierFeaturesField
              features={features}
              onChange={setFeatures}
              disabled={fieldsDisabled}
            />

            <PlanTierStripeFields
              values={stripeValues}
              disabled={fieldsDisabled}
              onChange={(field, value) =>
                setStripeValues((prev) => ({ ...prev, [field]: value }))
              }
            />

            <PlanTierCapabilityField
              assigned={capabilities}
              snapshotId={snapshotId}
              onAssign={(capabilityId) => {
                setCapabilities((prev) => {
                  if (
                    prev.some(
                      (cap) => resolveTierCapabilityId(cap) === capabilityId,
                    )
                  ) {
                    return prev;
                  }
                  const match = prev.find(
                    (cap) => resolveTierCapabilityId(cap) === capabilityId,
                  );
                  return [
                    ...prev,
                    match ?? {
                      id: capabilityId,
                      capabilityId,
                      name: "",
                      key: "",
                      sortOrder: prev.length,
                    },
                  ];
                });
              }}
              onRemove={(capabilityId) =>
                setCapabilities((prev) =>
                  prev.filter(
                    (cap) => resolveTierCapabilityId(cap) !== capabilityId,
                  ),
                )
              }
              disabled={fieldsDisabled}
            />

            {canManage ? (
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deleteMutation.isPending || disabled}
                  onClick={() => deleteMutation.mutate()}
                >
                  {deleteMutation.isPending ? "Deleting…" : "Delete tier"}
                </Button>
              </div>
            ) : null}
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <TierAccordionPreview
              tier={previewTier}
              designSettings={previewContext.designSettings}
              currency={previewContext.currency}
              billingCycles={previewContext.billingCycles}
            />
          </aside>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
});

type PlanTierDraftAccordionItemProps = {
  draftId: string;
  canManage: boolean;
  disabled?: boolean;
  onCancel: () => void;
  previewContext: TierPreviewContext;
  snapshotId?: string | null;
};

export const PlanTierDraftAccordionItem = forwardRef<
  DraftTierEditorHandle,
  PlanTierDraftAccordionItemProps
>(function PlanTierDraftAccordionItem(
  { draftId, canManage, disabled = false, onCancel, previewContext, snapshotId },
  ref,
) {
  const [pendingCapabilities, setPendingCapabilities] = useState<
    PendingCapability[]
  >([]);
  const [features, setFeatures] = useState<TierFeatureInput[]>([]);
  const [designSettings, setDesignSettings] = useState<PlanTierDesignSettings>({});
  const [stripeValues, setStripeValues] = useState<PlanTierStripeFormValues>({
    stripeProductId: "",
    stripeMonthlyPriceId: "",
    stripeYearlyPriceId: "",
  });

  const form = useForm<CreatePlanTierValues>({
    resolver: zodResolver(createPlanTierSchema),
    defaultValues: emptyTierValues,
  });

  const watchedValues = useWatch({ control: form.control });
  const previewFormValues = useMemo(
    () => ({
      ...emptyTierValues,
      ...(watchedValues ?? {}),
    }),
    [watchedValues],
  );
  const previewCapabilities = usePreviewCapabilities(pendingCapabilities);
  const previewTier = useMemo(
    () =>
      buildPreviewTier(
        previewFormValues,
        features,
        pendingCapabilities,
        designSettings,
        {
          defaultCtaLabel: previewContext.defaultCtaLabel,
          defaultCtaUrl: previewContext.defaultCtaUrl,
          capabilities: previewCapabilities,
        },
      ),
    [
      previewFormValues,
      features,
      pendingCapabilities,
      designSettings,
      previewCapabilities,
      previewContext.defaultCtaLabel,
      previewContext.defaultCtaUrl,
    ],
  );

  useImperativeHandle(ref, () => ({
    validate: () => form.trigger(),
    getPayload: () => ({
      values: form.getValues(),
      capabilityIds: pendingCapabilities.map((cap) => cap.id),
      features,
      designSettings,
      stripeMetadata: stripeFormValuesToMetadata(stripeValues),
    }),
  }));

  const fieldsDisabled = !canManage || disabled;

  return (
    <AccordionItem value={draftId} className="border-b px-4 last:border-b-0">
      <div className="flex items-center gap-2">
        {canManage ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
            aria-label="Discard new tier"
            disabled={disabled}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onCancel();
            }}
          >
            <X className="size-4" />
          </Button>
        ) : null}
        <AccordionTrigger className="min-w-0 flex-1 items-center py-4 hover:no-underline">
          <span className="min-w-0 flex-1 text-left font-medium text-primary">
            New tier
          </span>
        </AccordionTrigger>
      </div>
      <AccordionContent className="pb-4">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
          <div className="min-w-0 space-y-4">
            <Form {...form}>
              <FormSchemaProvider schema={createPlanTierSchema}>
                <div className="space-y-4">
                  <PlanTierFormFields
                    control={form.control}
                    disabled={fieldsDisabled}
                    cardBackgroundColor={designSettings.cardBackgroundColor}
                    onCardBackgroundColorChange={(cardBackgroundColor) =>
                      setDesignSettings((prev) => {
                        const next = { ...prev };
                        if (cardBackgroundColor.trim()) {
                          next.cardBackgroundColor = cardBackgroundColor;
                        } else {
                          delete next.cardBackgroundColor;
                        }
                        return next;
                      })
                    }
                  />
                </div>
              </FormSchemaProvider>
            </Form>

            <PlanTierFeaturesField
              features={features}
              onChange={setFeatures}
              disabled={fieldsDisabled}
            />

            <PlanTierStripeFields
              values={stripeValues}
              disabled={fieldsDisabled}
              onChange={(field, value) =>
                setStripeValues((prev) => ({ ...prev, [field]: value }))
              }
            />

            <PlanTierCapabilityField
              assigned={pendingCapabilities}
              snapshotId={snapshotId}
              onAssign={(capabilityId) => {
                setPendingCapabilities((prev) => {
                  if (prev.some((cap) => cap.id === capabilityId)) return prev;
                  return [
                    ...prev,
                    { id: capabilityId, name: "", key: "" },
                  ];
                });
              }}
              onRemove={(capabilityId) =>
                setPendingCapabilities((prev) =>
                  prev.filter((cap) => cap.id !== capabilityId),
                )
              }
              disabled={fieldsDisabled}
            />
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <TierAccordionPreview
              tier={previewTier}
              designSettings={previewContext.designSettings}
              currency={previewContext.currency}
              billingCycles={previewContext.billingCycles}
            />
          </aside>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
});
