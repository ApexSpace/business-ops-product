"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Accordion } from "@/components/ui/accordion";
import type {
  PlanEmbedSettings,
  PlanGroupDesignSettings,
  PlanTier,
  TierCapability,
} from "@/features/platform/types/plan-group";
import { resolvePlanGroupDesignSettings } from "@/features/platform/utils/plan-design-settings.util";
import {
  assignPlatformPlanTierCapabilities,
  createPlatformPlanTier,
  removePlatformPlanTierCapability,
  updatePlatformPlanTier,
} from "@/features/platform/api/plan-groups.api";
import { queryKeys } from "@/lib/query/keys";
import {
  PlanTierAccordionItem,
  PlanTierDraftAccordionItem,
  type DraftTierEditorHandle,
  type ExistingTierEditorHandle,
} from "./plan-tier-accordion-item";
import {
  resolveTierCapabilityId,
  valuesToTierBody,
} from "./plan-tier-form.utils";

let draftCounter = 0;

function nextDraftId(): string {
  draftCounter += 1;
  return `draft-${draftCounter}`;
}

async function syncTierCapabilities(
  planGroupId: string,
  tierId: string,
  desiredIds: string[],
  original: TierCapability[],
) {
  const originalIds = new Set(
    original.map(resolveTierCapabilityId).filter(Boolean),
  );
  const desiredSet = new Set(desiredIds);

  for (const capabilityId of desiredIds) {
    if (!originalIds.has(capabilityId)) {
      await assignPlatformPlanTierCapabilities(planGroupId, tierId, [
        capabilityId,
      ]);
    }
  }

  for (const cap of original) {
    const capabilityId = resolveTierCapabilityId(cap);
    if (capabilityId && !desiredSet.has(capabilityId)) {
      await removePlatformPlanTierCapability(
        planGroupId,
        tierId,
        capabilityId,
      );
    }
  }
}

export type PlanGroupTiersTabHandle = {
  saveAll: () => Promise<void>;
};

type PlanGroupTiersTabProps = {
  planGroupId: string;
  tiers: PlanTier[];
  canManage: boolean;
  onSavingChange?: (isSaving: boolean) => void;
  designSettings?: PlanGroupDesignSettings | null;
  embed?: PlanEmbedSettings | null;
  currency: string;
  billingCycles: string[];
  defaultCtaLabel?: string | null;
  defaultCtaUrl?: string | null;
  snapshotId?: string | null;
};

export const PlanGroupTiersTab = forwardRef<
  PlanGroupTiersTabHandle,
  PlanGroupTiersTabProps
>(function PlanGroupTiersTab(
  {
    planGroupId,
    tiers,
    canManage,
    onSavingChange,
    designSettings,
    embed,
    currency,
    billingCycles,
    defaultCtaLabel,
    defaultCtaUrl,
    snapshotId,
  },
  ref,
) {
  const queryClient = useQueryClient();
  const previewContext = useMemo(
    () => ({
      designSettings: resolvePlanGroupDesignSettings(designSettings, embed),
      currency,
      billingCycles,
      defaultCtaLabel,
      defaultCtaUrl,
    }),
    [
      designSettings,
      embed,
      currency,
      billingCycles,
      defaultCtaLabel,
      defaultCtaUrl,
    ],
  );
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [openIds, setOpenIds] = useState<string[]>([]);
  const existingRefs = useRef(new Map<string, ExistingTierEditorHandle>());
  const draftRefs = useRef(new Map<string, DraftTierEditorHandle>());

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.platform.planGroups.tiers(planGroupId),
    });

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const tier of tiers) {
        const editor = existingRefs.current.get(tier.id);
        if (!editor) continue;
        const { values, capabilityIds, originalCapabilities, features, designSettings, stripeMetadata } =
          editor.getPayload();
        if (
          features.some((feature) => !feature.label.trim()) ||
          features.filter((feature) => feature.label.trim()).length !==
            features.length
        ) {
          throw new Error(`Feature label is required in "${tier.name}"`);
        }
        const uniqueCapabilityIds = new Set(capabilityIds);
        if (uniqueCapabilityIds.size !== capabilityIds.length) {
          throw new Error(`Duplicate capabilities in "${tier.name}"`);
        }
        await updatePlatformPlanTier(
          planGroupId,
          tier.id,
          valuesToTierBody(values, features, designSettings, {
            ...(tier.metadata ?? {}),
            ...stripeMetadata,
          }),
        );
        await syncTierCapabilities(
          planGroupId,
          tier.id,
          capabilityIds,
          originalCapabilities,
        );
      }

      for (const draftId of draftIds) {
        const editor = draftRefs.current.get(draftId);
        if (!editor) continue;
        const { values, capabilityIds, features, designSettings, stripeMetadata } = editor.getPayload();
        if (features.some((feature) => !feature.label.trim())) {
          throw new Error("Feature label is required in the new tier");
        }
        const uniqueCapabilityIds = new Set(capabilityIds);
        if (uniqueCapabilityIds.size !== capabilityIds.length) {
          throw new Error("Duplicate capabilities in the new tier");
        }
        const created = await createPlatformPlanTier(
          planGroupId,
          valuesToTierBody(values, features, designSettings, stripeMetadata),
        );
        if (capabilityIds.length > 0) {
          await assignPlatformPlanTierCapabilities(
            planGroupId,
            created.id,
            capabilityIds,
          );
        }
      }
    },
    onSuccess: () => {
      toast.success("Tiers saved");
      for (const tier of tiers) {
        const editor = existingRefs.current.get(tier.id);
        if (!editor) continue;
        const { features, capabilityIds } = editor.getPayload();
        const filledFeatures = features.filter((feature) =>
          feature.label.trim(),
        );
        if (filledFeatures.length === 0 && capabilityIds.length === 0) {
          toast.warning(
            `"${tier.name}" has no features or capabilities — consider adding some for a richer pricing card.`,
          );
        }
      }
      setDraftIds([]);
      void invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  useEffect(() => {
    onSavingChange?.(saveMutation.isPending);
  }, [onSavingChange, saveMutation.isPending]);

  const validateAll = useCallback(async (): Promise<boolean> => {
    for (const tier of tiers) {
      const editor = existingRefs.current.get(tier.id);
      if (editor && !(await editor.validate())) {
        toast.error(`Fix validation errors in "${tier.name}"`);
        setOpenIds((prev) => [...new Set([...prev, tier.id])]);
        return false;
      }
    }

    for (const draftId of draftIds) {
      const editor = draftRefs.current.get(draftId);
      if (editor && !(await editor.validate())) {
        toast.error("Fix validation errors in the new tier");
        setOpenIds((prev) => [...new Set([...prev, draftId])]);
        return false;
      }
    }

    return true;
  }, [draftIds, tiers]);

  useImperativeHandle(ref, () => ({
    saveAll: async () => {
      if (!(await validateAll())) return;
      saveMutation.mutate();
    },
  }));

  const addDraft = () => {
    const id = nextDraftId();
    setDraftIds((prev) => [...prev, id]);
    setOpenIds((prev) => [...prev, id]);
  };

  const removeDraft = (draftId: string) => {
    setDraftIds((prev) => prev.filter((id) => id !== draftId));
    setOpenIds((prev) => prev.filter((id) => id !== draftId));
    draftRefs.current.delete(draftId);
  };

  const accordionValue = [...openIds];
  const isSaving = saveMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">Tiers</h2>
          <p className="text-xs text-muted-foreground">
            Configure packages, pricing, and capability access for this plan
            group. Use <strong>Save</strong> in the page header to persist all
            tiers at once.
          </p>
        </div>
        {canManage ? (
          <Button
            type="button"
            onClick={addDraft}
            className="shrink-0"
            disabled={isSaving}
          >
            <Plus className="mr-2 size-4" />
            Add tier
          </Button>
        ) : null}
      </div>

      {tiers.length === 0 && draftIds.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No tiers yet. Click <strong>Add tier</strong> to create your first
          package.
        </p>
      ) : (
        <Accordion
          value={accordionValue}
          onValueChange={(value) => {
            setOpenIds(Array.isArray(value) ? value : value ? [value] : []);
          }}
          multiple
          className="rounded-lg border"
        >
          {tiers.map((tier) => (
            <PlanTierAccordionItem
              key={tier.id}
              ref={(handle) => {
                if (handle) existingRefs.current.set(tier.id, handle);
                else existingRefs.current.delete(tier.id);
              }}
              planGroupId={planGroupId}
              tier={tier}
              canManage={canManage}
              disabled={isSaving}
              previewContext={previewContext}
              snapshotId={snapshotId}
            />
          ))}
          {draftIds.map((draftId) => (
            <PlanTierDraftAccordionItem
              key={draftId}
              ref={(handle) => {
                if (handle) draftRefs.current.set(draftId, handle);
                else draftRefs.current.delete(draftId);
              }}
              draftId={draftId}
              canManage={canManage}
              disabled={isSaving}
              onCancel={() => removeDraft(draftId)}
              previewContext={previewContext}
              snapshotId={snapshotId}
            />
          ))}
        </Accordion>
      )}
    </div>
  );
});
