"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  extendOperationsCampaign,
  getOperationsCampaign,
  listOperationsCampaigns,
  migrateOperationsCampaign,
  notifyOperationsCampaign,
  patchOperationsCampaignMembers,
  type CampaignType,
  type OperationsCampaign,
} from "@/features/platform/api/operations.api";

const TABS: Array<{ id: "ALL" | CampaignType; label: string }> = [
  { id: "ALL", label: "All" },
  { id: "TIER_PRICE", label: "Price" },
  { id: "ADDON_PACKAGING", label: "Add-ons" },
  { id: "TIER_CAPABILITY", label: "Capabilities" },
  { id: "CAPABILITY_FEATURE", label: "Services" },
];

const TYPE_LABEL: Record<CampaignType, string> = {
  TIER_PRICE: "Price",
  ADDON_PACKAGING: "Add-on",
  TIER_CAPABILITY: "Capability",
  CAPABILITY_FEATURE: "Service",
};

export function PlatformOperationsPage({
  initialCampaignId,
  initialTab,
}: {
  initialCampaignId?: string;
  initialTab?: "ALL" | CampaignType;
}) {
  const [tab, setTab] = useState<"ALL" | CampaignType>(initialTab ?? "ALL");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialCampaignId ?? null,
  );
  const [selectedBusinessIds, setSelectedBusinessIds] = useState<Set<string>>(
    new Set(),
  );
  const [extendDays, setExtendDays] = useState("10");
  const qc = useQueryClient();

  const listQuery = useQuery({
    queryKey: ["platform", "operations", "campaigns", tab],
    queryFn: () =>
      listOperationsCampaigns({
        limit: 50,
        ...(tab === "ALL" ? {} : { type: tab }),
        status: undefined,
      }),
  });

  const openItems = useMemo(() => {
    const items = listQuery.data?.items ?? [];
    return items.filter((c) =>
      ["OPEN", "NOTIFIED", "DUE"].includes(c.status),
    );
  }, [listQuery.data]);

  const activeId = selectedId ?? openItems[0]?.id ?? null;

  const detailQuery = useQuery({
    queryKey: ["platform", "operations", "campaign", activeId],
    queryFn: () => getOperationsCampaign(activeId!),
    enabled: !!activeId,
  });

  const campaign = detailQuery.data;

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["platform", "operations"] });
  };

  const notify = useMutation({
    mutationFn: () =>
      notifyOperationsCampaign(activeId!, {
        businessIds:
          selectedBusinessIds.size > 0
            ? [...selectedBusinessIds]
            : undefined,
      }),
    onSuccess: (r) => {
      const queued = r.queued ?? r.notifiedCount ?? 0;
      const skipped = r.skipped ?? r.skippedCount ?? 0;
      const failed = r.failed ?? r.failedCount ?? 0;
      if (queued > 0 && failed === 0 && skipped === 0) {
        toast.success(`Queued ${queued} email(s) to owners`);
      } else if (queued > 0) {
        toast.success(
          `Queued ${queued}; skipped ${skipped}; failed ${failed}`,
        );
      } else if (skipped > 0 && failed === 0) {
        toast.message(
          `No new emails — ${skipped} still queued or in-flight. Ensure the worker is running, then click Email again.`,
        );
      } else {
        toast.error(
          `Email failed (${failed}). Ensure Redis + worker are running, then check email_messages.`,
        );
      }
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Email failed"),
  });

  const extend = useMutation({
    mutationFn: () =>
      extendOperationsCampaign(activeId!, {
        businessIds:
          selectedBusinessIds.size > 0
            ? [...selectedBusinessIds]
            : undefined,
        days: Number(extendDays) || 10,
      }),
    onSuccess: (r) => {
      toast.success(`Extended ${r.extendedCount} business(es)`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Extend failed"),
  });

  const migrate = useMutation({
    mutationFn: () =>
      migrateOperationsCampaign(activeId!, {
        businessIds:
          selectedBusinessIds.size > 0
            ? [...selectedBusinessIds]
            : undefined,
      }),
    onSuccess: (r) => {
      if (r.failureCount > 0) {
        toast.warning(
          `Migrated ${r.migratedCount}; ${r.failureCount} failed (Stripe remaps are fail-closed — local amount unchanged for failures)`,
        );
      } else {
        toast.success(`Migrated ${r.migratedCount} business(es)`);
      }
      setSelectedBusinessIds(new Set());
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Migrate failed"),
  });

  const patchMembers = useMutation({
    mutationFn: (input: { businessIds: string[]; included: boolean }) =>
      patchOperationsCampaignMembers(activeId!, input),
    onSuccess: () => {
      toast.success("Updated selection");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Update failed"),
  });

  const toggleBusiness = (businessId: string, checked: boolean) => {
    setSelectedBusinessIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(businessId);
      else next.delete(businessId);
      return next;
    });
  };

  const allBusinessIds =
    campaign?.groups.flatMap((g) =>
      g.businesses.filter((b) => b.included && b.status !== "MIGRATED").map((b) => b.businessId),
    ) ?? [];

  return (
    <div className="flex h-full min-h-[70vh] flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Operations</h1>
        <div className="flex flex-wrap gap-1 rounded-md border bg-muted/40 p-1">
          {TABS.map((t) => (
            <Button
              key={t.id}
              size="sm"
              variant={tab === t.id ? "secondary" : "ghost"}
              onClick={() => {
                setTab(t.id);
                setSelectedId(null);
                setSelectedBusinessIds(new Set());
              }}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[320px_1fr]">
        <div className="overflow-auto rounded-lg border">
          {listQuery.isLoading ? (
            <div className="space-y-2 p-3">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : openItems.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No open campaigns</p>
          ) : (
            <ul className="divide-y">
              {openItems.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className={cn(
                      "w-full px-3 py-3 text-left text-sm hover:bg-muted/50",
                      activeId === c.id && "bg-muted",
                    )}
                    onClick={() => {
                      setSelectedId(c.id);
                      setSelectedBusinessIds(new Set());
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{c.summary}</span>
                      <Badge variant="outline">{TYPE_LABEL[c.type]}</Badge>
                    </div>
                    <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
                      <span>{c.pendingCount} pending</span>
                      {c.tierName ? <span>· {c.tierName}</span> : null}
                      {c.effectiveAt ? (
                        <span>· {c.effectiveAt.slice(0, 10)}</span>
                      ) : null}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="overflow-auto rounded-lg border p-4">
          {!activeId || detailQuery.isLoading ? (
            <Skeleton className="h-40" />
          ) : !campaign ? (
            <p className="text-sm text-muted-foreground">Select a campaign</p>
          ) : (
            <CampaignDetail
              campaign={campaign}
              selectedBusinessIds={selectedBusinessIds}
              allBusinessIds={allBusinessIds}
              extendDays={extendDays}
              onExtendDaysChange={setExtendDays}
              onToggle={toggleBusiness}
              onSelectAll={(checked) =>
                setSelectedBusinessIds(
                  checked ? new Set(allBusinessIds) : new Set(),
                )
              }
              onNotify={() => notify.mutate()}
              onExtend={() => extend.mutate()}
              onMigrate={() => migrate.mutate()}
              onExclude={() =>
                patchMembers.mutate({
                  businessIds: [...selectedBusinessIds],
                  included: false,
                })
              }
              onInclude={() =>
                patchMembers.mutate({
                  businessIds: [...selectedBusinessIds],
                  included: true,
                })
              }
              pending={
                notify.isPending ||
                extend.isPending ||
                migrate.isPending ||
                patchMembers.isPending
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

function CampaignDetail({
  campaign,
  selectedBusinessIds,
  allBusinessIds,
  extendDays,
  onExtendDaysChange,
  onToggle,
  onSelectAll,
  onNotify,
  onExtend,
  onMigrate,
  onExclude,
  onInclude,
  pending,
}: {
  campaign: OperationsCampaign;
  selectedBusinessIds: Set<string>;
  allBusinessIds: string[];
  extendDays: string;
  onExtendDaysChange: (v: string) => void;
  onToggle: (businessId: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onNotify: () => void;
  onExtend: () => void;
  onMigrate: () => void;
  onExclude: () => void;
  onInclude: () => void;
  pending: boolean;
}) {
  const selectedCount = selectedBusinessIds.size;
  const price = campaign.priceChange;
  const money = (v: number | null | undefined) =>
    v == null || Number.isNaN(v) ? "—" : `$${v.toFixed(2)}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{campaign.summary}</h2>
            <Badge>{campaign.status}</Badge>
            <Badge variant="outline">{TYPE_LABEL[campaign.type]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {campaign.pendingCount} pending · due{" "}
            {campaign.effectiveAt?.slice(0, 10) ?? "—"}
          </p>
          {price ? (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <p>
                Monthly:{" "}
                <span className="font-medium">
                  {money(price.previousPriceMonthly)}
                </span>{" "}
                →{" "}
                <span className="font-medium">
                  {money(price.priceMonthly)}
                </span>
              </p>
              <p className="text-muted-foreground">
                Yearly: {money(price.previousPriceYearly)} →{" "}
                {money(price.priceYearly)}
              </p>
            </div>
          ) : null}
          {(campaign.description || campaign.message) && (
            <pre className="whitespace-pre-wrap rounded-md border bg-muted/20 px-3 py-2 font-sans text-sm text-muted-foreground">
              {campaign.description || campaign.message}
            </pre>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="w-20"
            type="number"
            min={1}
            value={extendDays}
            onChange={(e) => onExtendDaysChange(e.target.value)}
            aria-label="Extend days"
            title="Days to add when clicking Extend"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={onExtend}
            title="Push the due date later for selected businesses (or all pending)"
          >
            Extend{selectedCount ? ` (${selectedCount})` : ""}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={onNotify}
            title="Email owners about this change"
          >
            Email{selectedCount ? ` (${selectedCount})` : ""}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending || selectedCount === 0}
            onClick={onExclude}
            title="Skip selected businesses from migrate / auto-force"
          >
            Exclude
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending || selectedCount === 0}
            onClick={onInclude}
            title="Put excluded businesses back into the campaign"
          >
            Include
          </Button>
          <Button
            size="sm"
            disabled={pending}
            onClick={onMigrate}
            title="Apply the change now (new price / revoke access) for selected or all pending"
          >
            Migrate{selectedCount ? ` (${selectedCount})` : ""}
          </Button>
        </div>
      </div>

      <div className="grid gap-2 rounded-md border px-3 py-2 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
        <p>
          <span className="font-medium text-foreground">Extend</span> — add N
          days to the due date (selected or all).
        </p>
        <p>
          <span className="font-medium text-foreground">Email</span> — notify
          owners; does not change price/access yet.
        </p>
        <p>
          <span className="font-medium text-foreground">Exclude / Include</span>{" "}
          — skip or re-add businesses from this campaign.
        </p>
        <p>
          <span className="font-medium text-foreground">Migrate</span> — apply
          the change now (billing/access). Auto-runs after due date.
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={
            allBusinessIds.length > 0 &&
            allBusinessIds.every((id) => selectedBusinessIds.has(id))
          }
          onCheckedChange={(v) => onSelectAll(v === true)}
        />
        <span className="text-muted-foreground">Select all pending</span>
      </div>

      <div className="space-y-4">
        {campaign.groups.map((group) => (
          <div key={group.tierId ?? "none"} className="rounded-md border">
            <div className="border-b bg-muted/40 px-3 py-2 text-sm font-medium">
              {group.tierName ?? "No tier"} · {group.businesses.length}
            </div>
            <ul className="divide-y">
              {group.businesses.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center gap-3 px-3 py-2 text-sm"
                >
                  <Checkbox
                    checked={selectedBusinessIds.has(b.businessId)}
                    disabled={b.status === "MIGRATED"}
                    onCheckedChange={(v) =>
                      onToggle(b.businessId, v === true)
                    }
                  />
                  <Link
                    href={`/platform/businesses/${b.businessId}?tab=access`}
                    className="min-w-0 flex-1 truncate font-medium hover:underline"
                  >
                    {b.businessName}
                  </Link>
                  <Badge
                    variant={
                      b.status === "MIGRATED"
                        ? "secondary"
                        : b.included
                          ? "outline"
                          : "destructive"
                    }
                  >
                    {b.included ? b.status : "EXCLUDED"}
                  </Badge>
                  <span className="w-24 text-right text-xs text-muted-foreground">
                    {(b.effectiveAt ?? campaign.effectiveAt)?.slice(0, 10) ??
                      "—"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
