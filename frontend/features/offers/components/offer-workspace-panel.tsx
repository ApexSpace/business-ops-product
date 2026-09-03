"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { EntityDetailTabs } from "@/components/layout/entity-detail-tabs";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreActionsButton } from "@/components/ui/more-actions-button";
import {
  deleteOffer,
  disableOffer,
  duplicateOffer,
  enableOffer,
  getOffer,
  updateOfferDetails,
} from "@/features/offers/api/offers.api";
import { OfferAdvancedSection } from "@/features/offers/components/offer-advanced-section";
import { OfferDetailsSection } from "@/features/offers/components/offer-details-section";
import { OfferDiscountsSection } from "@/features/offers/components/offer-discounts-section";
import {
  OFFER_DETAIL_TABS,
  type OfferTabId,
} from "@/features/offers/utils/offer-workspace-utils";
import { SETTINGS_CONTENT_SHELL_CLASS } from "@/lib/design/settings-form-tokens";
import { invalidateOffers } from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";

type OfferWorkspacePanelProps = {
  offerId: string;
  canManage?: boolean;
  initialTab?: OfferTabId;
  onTabChange?: (tab: OfferTabId) => void;
  onDeleted?: () => void;
  onDuplicated?: (id: string) => void;
};

export function OfferWorkspacePanel({
  offerId,
  canManage = true,
  initialTab = "details",
  onTabChange,
  onDeleted,
  onDuplicated,
}: OfferWorkspacePanelProps) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<OfferTabId>(initialTab);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab, offerId]);

  const detailQuery = useQuery({
    queryKey: queryKeys.offers.detail(offerId),
    queryFn: () => getOffer(offerId),
  });

  const invalidate = async () => invalidateOffers(queryClient);

  const saveDetails = useMutation({
    mutationFn: (body: Parameters<typeof updateOfferDetails>[1]) =>
      updateOfferDetails(offerId, body),
    onSuccess: async () => {
      toast.success("Offer saved");
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleEnabled = useMutation({
    mutationFn: (enabled: boolean) =>
      enabled ? enableOffer(offerId) : disableOffer(offerId),
    onSuccess: async (_, enabled) => {
      toast.success(enabled ? "Offer enabled" : "Offer disabled");
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: () => duplicateOffer(offerId),
    onSuccess: async (offer) => {
      toast.success("Offer duplicated");
      await invalidate();
      onDuplicated?.(offer.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteOffer(offerId),
    onSuccess: async () => {
      toast.success("Offer deleted");
      setDeleteOpen(false);
      await invalidate();
      onDeleted?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tabs = useMemo(() => OFFER_DETAIL_TABS, []);

  if (detailQuery.isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading offer…</div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <ApiErrorState
        className="m-6"
        error={detailQuery.error}
        title="Could not load offer"
        onRetry={() => void detailQuery.refetch()}
      />
    );
  }

  const offer = detailQuery.data;

  return (
    <div className={cn(SETTINGS_CONTENT_SHELL_CLASS, "max-w-4xl")}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <h2 className="truncate text-2xl font-semibold tracking-tight">
            {offer.name}
          </h2>
          <Badge variant={offer.isEnabled ? "success" : "neutral"}>
            {offer.isEnabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>
        {canManage ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<MoreActionsButton aria-label="Offer actions" />}
            />
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                disabled={toggleEnabled.isPending}
                onClick={() => toggleEnabled.mutate(!offer.isEnabled)}
              >
                {offer.isEnabled ? "Disable" : "Enable"}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={duplicateMutation.isPending}
                onClick={() => duplicateMutation.mutate()}
              >
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <EntityDetailTabs
        variant="panel"
        value={tab}
        onValueChange={(value) => {
          const next = value as OfferTabId;
          setTab(next);
          onTabChange?.(next);
        }}
        tabs={tabs}
        aria-label="Offer sections"
        className="-mx-[var(--settings-content-padding-x)]"
      />

      <div className="min-w-0">
        {tab === "details" ? (
          <OfferDetailsSection
            offer={offer}
            canManage={canManage}
            isSaving={saveDetails.isPending}
            onSave={async (body) => {
              await saveDetails.mutateAsync(body);
            }}
          />
        ) : null}
        {tab === "discounts" ? (
          <OfferDiscountsSection offer={offer} canManage={canManage} />
        ) : null}
        {tab === "advanced" ? (
          <OfferAdvancedSection offer={offer} canManage={canManage} />
        ) : null}
      </div>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete offer?"
        description="This offer will be permanently removed. This action cannot be undone."
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}
