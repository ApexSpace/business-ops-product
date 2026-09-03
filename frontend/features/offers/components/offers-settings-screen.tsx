"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Tag } from "lucide-react";
import { toast } from "sonner";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import {
  createOffer,
  listOffers,
  reorderOffers,
} from "@/features/offers/api/offers.api";
import { OffersSidebar } from "@/features/offers/components/offers-sidebar";
import { OfferWorkspacePanel } from "@/features/offers/components/offer-workspace-panel";
import { useOfferStaffPermissions } from "@/features/offers/hooks/use-offer-staff-permissions";
import type { OfferCreateFormValues } from "@/features/offers/schemas/offer-create";
import type { OfferTabId } from "@/features/offers/utils/offer-workspace-utils";
import { SETTINGS_FORM_SURFACE_CLASS } from "@/lib/design/settings-form-tokens";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import { invalidateOffers } from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import { useEntitySelection } from "@/lib/routing/use-entity-selection";
import { cn } from "@/lib/utils";

const LIST_LIMIT = 100;

export function OffersSettingsScreen() {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { canManage } = useOfferStaffPermissions();
  const {
    selectedId,
    tab,
    setSelectedId,
    setTab,
    clearSelection,
  } = useEntitySelection({
    legacyIdParams: ["selected", "offer"],
    defaultTab: "details",
  });

  const [search, setSearch] = useState("");
  const [showListOnMobile, setShowListOnMobile] = useState(!selectedId);

  const listFilters = useMemo(
    () => ({
      page: 1,
      limit: LIST_LIMIT,
      search: search.trim() || undefined,
    }),
    [search],
  );

  const offersQuery = useQuery({
    queryKey: queryKeys.offers.list(listFilters),
    queryFn: () => listOffers(listFilters),
  });

  const offers = offersQuery.data?.items ?? [];
  const activeTab = (tab ?? "details") as OfferTabId;

  const selectOffer = useCallback(
    (id: string) => {
      setSelectedId(id);
      setTab("details");
      setShowListOnMobile(false);
    },
    [setSelectedId, setTab],
  );

  const createMutation = useMutation({
    mutationFn: (values: OfferCreateFormValues) =>
      createOffer({
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
      }),
    onSuccess: async (offer) => {
      toast.success("Offer created");
      await invalidateOffers(queryClient);
      selectOffer(offer.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) => reorderOffers(ids),
    onSuccess: async () => {
      await invalidateOffers(queryClient);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const showSidebar = !isMobile || showListOnMobile || !selectedId;
  const showWorkspace = selectedId && (!isMobile || !showListOnMobile);

  return (
    <div
      className={cn(
        "flex h-[calc(100vh-8rem)] min-h-[520px] w-full gap-0 overflow-hidden rounded-lg border bg-card",
        SETTINGS_FORM_SURFACE_CLASS,
      )}
    >
      {showSidebar ? (
        <OffersSidebar
          search={search}
          onSearchChange={setSearch}
          offers={offers}
          isLoading={offersQuery.isLoading}
          isError={offersQuery.isError}
          error={offersQuery.error}
          onRetry={() => void offersQuery.refetch()}
          selectedId={selectedId}
          onSelect={selectOffer}
          onCreate={async (values) => {
            await createMutation.mutateAsync(values);
          }}
          onReorder={(ids) => reorderMutation.mutate(ids)}
          canManage={canManage}
          createPending={createMutation.isPending}
        />
      ) : null}

      {showWorkspace ? (
        <main className="min-w-0 flex-1 overflow-y-auto p-[var(--settings-content-padding-y)] px-[var(--settings-content-padding-x)]">
          {isMobile ? (
            <button
              type="button"
              className="mb-4 text-sm font-medium text-primary"
              onClick={() => {
                setShowListOnMobile(true);
              }}
            >
              ← Back to offers
            </button>
          ) : null}
          <OfferWorkspacePanel
            offerId={selectedId!}
            canManage={canManage}
            initialTab={activeTab}
            onTabChange={(next) => setTab(next)}
            onDeleted={() => {
              clearSelection();
              setShowListOnMobile(true);
            }}
            onDuplicated={(id) => selectOffer(id)}
          />
        </main>
      ) : !isMobile ? (
        <main className="min-w-0 flex-1 overflow-y-auto p-[var(--settings-content-padding-y)] px-[var(--settings-content-padding-x)]">
          {offersQuery.isError ? (
            <ApiErrorState
              error={offersQuery.error}
              title="Could not load offers"
              onRetry={() => void offersQuery.refetch()}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Tag className="mb-3 size-10 opacity-40" aria-hidden />
              <h2 className="text-lg font-semibold">Manage your offers</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Select an offer from the sidebar, or create a new one to
                configure details, discounts, and advanced settings.
              </p>
            </div>
          )}
        </main>
      ) : null}
    </div>
  );
}

/** @deprecated Prefer OffersSettingsScreen — kept for existing imports. */
export function OffersScreen() {
  return <OffersSettingsScreen />;
}
