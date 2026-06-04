"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { subscriptionStatusOptions } from "@/features/platform/utils/select-options";
import type {
  BillingSubscription,
  Plan,
  SubscriptionStatus,
} from "@/features/platform/types";
import type { PaginatedResult } from "@/lib/types/shared";

export function PlatformBusinessBillingTab({
  subscription,
  plans,
  canBilling,
  selectedPlanId,
  setSelectedPlanId,
  selectedStatus,
  setSelectedStatus,
  assignSubscriptionPending,
  onAssignSubscription,
}: {
  subscription?: BillingSubscription | null;
  plans?: PaginatedResult<Plan>;
  canBilling: boolean;
  selectedPlanId: string;
  setSelectedPlanId: (id: string) => void;
  selectedStatus: SubscriptionStatus;
  setSelectedStatus: (status: SubscriptionStatus) => void;
  assignSubscriptionPending: boolean;
  onAssignSubscription: () => void;
}) {
  return (
    <div className="space-y-4">
      {subscription ? (
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Plan</dt>
            <dd>{subscription.planName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <Badge variant="secondary">{subscription.status}</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Monthly</dt>
            <dd>${subscription.priceMonthly}/mo</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Period end</dt>
            <dd>
              {subscription.currentPeriodEnd
                ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                : "—"}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">
          No subscription assigned yet.
        </p>
      )}
      {canBilling ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">Plan</p>
            <SearchableSelect
              items={
                plans?.items.map((p) => ({
                  value: p.id,
                  label: `${p.name} ($${p.priceMonthly}/mo)`,
                })) ?? []
              }
              value={selectedPlanId || subscription?.planId || null}
              onValueChange={(v) => setSelectedPlanId(v ?? "")}
              placeholder="Select plan"
              triggerClassName="w-[220px]"
            />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Status</p>
            <SearchableSelect
              items={subscriptionStatusOptions}
              value={selectedStatus}
              onValueChange={(v) =>
                v && setSelectedStatus(v as SubscriptionStatus)
              }
              triggerClassName="w-[160px]"
            />
          </div>
          <Button
            type="button"
            disabled={
              assignSubscriptionPending ||
              !(selectedPlanId || subscription?.planId)
            }
            onClick={onAssignSubscription}
          >
            {assignSubscriptionPending
              ? "Saving…"
              : subscription
                ? "Update subscription"
                : "Assign plan"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
