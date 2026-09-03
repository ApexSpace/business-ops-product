"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SettingsChoiceRadioGroup } from "@/components/forms/settings-choice-radio-group";
import { updateOfferDetails } from "@/features/offers/api/offers.api";
import type {
  MembershipCommissionBasis,
  Offer,
} from "@/features/offers/types";
import { SETTINGS_FORM_SECTION_STACK_CLASS } from "@/lib/design/settings-form-tokens";
import { invalidateOffers } from "@/lib/query/invalidation";
import { cn } from "@/lib/utils";

type OfferAdvancedSectionProps = {
  offer: Offer;
  canManage?: boolean;
};

export function OfferAdvancedSection({
  offer,
  canManage = true,
}: OfferAdvancedSectionProps) {
  const queryClient = useQueryClient();
  const [commissionBasis, setCommissionBasis] =
    useState<MembershipCommissionBasis>(offer.commissionBasis);

  useEffect(() => {
    setCommissionBasis(offer.commissionBasis);
  }, [offer.id, offer.commissionBasis, offer.updatedAt]);

  const saveAdvanced = useMutation({
    mutationFn: (next: MembershipCommissionBasis) =>
      updateOfferDetails(offer.id, { commissionBasis: next }),
    onSuccess: async () => {
      toast.success("Advanced settings saved");
      await invalidateOffers(queryClient);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className={cn(SETTINGS_FORM_SECTION_STACK_CLASS, "max-w-3xl")}>
      <h3 className="text-base font-medium">
        How is service commission calculated?
      </h3>
      <SettingsChoiceRadioGroup
        name="commission-basis"
        aria-label="Commission basis"
        value={commissionBasis}
        disabled={!canManage || saveAdvanced.isPending}
        onValueChange={(value) => {
          if (!canManage) return;
          const next = value as MembershipCommissionBasis;
          setCommissionBasis(next);
          saveAdvanced.mutate(next);
        }}
        options={[
          {
            value: "REGULAR_PRICE",
            label: "Based on regular price",
            description:
              "Commission will be calculated based on the regular service price.",
          },
          {
            value: "DISCOUNTED_PRICE",
            label: "Based on discounted price",
            description:
              "Commission will be calculated based on the discounted service price.",
          },
        ]}
      />
    </div>
  );
}
