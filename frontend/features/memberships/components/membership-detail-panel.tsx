"use client";

import { Crown } from "lucide-react";
import { DateTime } from "luxon";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { EmptyState } from "@/components/data-display/empty-state";
import { LoadingState } from "@/components/data-display/loading-state";
import { StatusBadge } from "@/components/data-display/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EntityDetailField } from "@/components/layout/entity-detail-section";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/features/payments/schemas/payment-profile";
import type {
  ClientMembershipDetail,
  ClientMembershipStatus,
  MembershipBillingIntervalUnit,
} from "@/features/memberships/types";

export function membershipPlanLabel(item: {
  plan: { name: string; emoji: string | null,
};
}) {
  const emoji = item.plan.emoji ?? "";
  return `${emoji} ${item.plan.name}`.trim();
}

export function MembershipStatusBadge({
  status,
}: {
  status: ClientMembershipStatus;
}) {
  return <StatusBadge domain="clientMembership" status={status} />;
}

export function formatMembershipPrice(
  price: string,
  unit: MembershipBillingIntervalUnit,
) {
  const short = unit === "WEEK" ? "wk" : unit === "YEAR" ? "yr" : "mo";
  return `${formatMoney(price)} / ${short}`;
}

function formatDetailDate(value: string) {
  return DateTime.fromISO(value).toFormat("MMMM d, yyyy");
}

function formatListDate(value: string) {
  return DateTime.fromISO(value).toFormat("MMMM d");
}

export interface MembershipDetailPanelProps {
  selectedId: string | null;
  detail: ClientMembershipDetail | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  actionPending: boolean;
  onOpenContact: (contactId: string) => void;
  className?: string;
  /** Drawer = mobile sheet; reserves space for the sheet close button. */
  variant?: "panel" | "drawer";
  /** Renders body only for EntityDetailDrawer (no aside chrome). */
  embedded?: boolean;
}

export function MembershipDetailPanel({
  selectedId,
  detail,
  isLoading,
  isError,
  error,
  onRetry,
  onPause,
  onResume,
  onCancel,
  actionPending,
  onOpenContact,
  className,
  variant = "panel",
  embedded = false,
}: MembershipDetailPanelProps) {
  const isDrawer = variant === "drawer";

  const body =
    isError && detail ? (
      <ApiErrorState error={error} onRetry={onRetry} />
    ) : !detail ? null : (
      <>
        {!embedded ? (
          <div
            className={cn(
              "shrink-0 border-b border-border px-4 py-3",
              isDrawer && "pr-14",
            )}
          >
            <h2 className="text-drawer-section">Membership detail</h2>
          </div>
        ) : null}

        <div
          className={cn(
            "min-h-0 flex-1 space-y-4 overflow-y-auto",
            embedded ? "" : "px-4 py-4",
          )}
        >
          <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                {detail.plan.emoji ? (
                  <span className="text-2xl" aria-hidden>
                    {detail.plan.emoji}
                  </span>
                ) : null}
                <p className="text-lg font-semibold tracking-tight">
                  {detail.plan.name}
                </p>
                <button
                  type="button"
                  className="text-sm font-medium text-primary hover:underline"
                  onClick={() => onOpenContact(detail.contact.id)}
                >
                  {detail.contact.name}
                </button>
              </div>
              <MembershipStatusBadge status={detail.status} />
            </div>
            <p className="mt-4 text-2xl font-bold tabular-nums">
              {formatMembershipPrice(detail.price, detail.billingIntervalUnit)}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <InfoBlock label="Start date">
              <p className="text-sm">{formatDetailDate(detail.startDate)}</p>
            </InfoBlock>
            {detail.nextBillingDate ? (
              <InfoBlock label="Next billing">
                <p className="text-sm">
                  {formatListDate(detail.nextBillingDate)}
                </p>
              </InfoBlock>
            ) : null}
          </div>

          {detail.usageRecords.length > 0 ? (
            <div className="space-y-2">
              <p className="text-drawer-section">Services remaining</p>
              <div className="grid gap-2">
                {detail.usageRecords.map((record) => {
                  const remaining = record.totalSlots - record.usedSlots;
                  return (
                    <div
                      key={record.id}
                      className="rounded-lg border border-border bg-muted/20 px-3 py-2.5"
                    >
                      <p className="text-sm font-medium tabular-nums">
                        {remaining} / {record.totalSlots} remaining
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {record.services.join(", ")}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {detail.billingHistory.length > 0 ? (
            <div className="space-y-2">
              <p className="text-drawer-section">Billing history</p>
              <div className="overflow-hidden rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Date</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.billingHistory.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDetailDate(event.occurredAt)}
                        </TableCell>
                        <TableCell className="capitalize">
                          {event.eventType.replace(/_/g, " ").toLowerCase()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {event.amount ? formatMoney(event.amount) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </div>

        {!embedded ? (
          <div className="shrink-0 space-y-2 border-t border-border px-4 py-3">
            {detail.status === "ACTIVE" ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={actionPending}
                onClick={onPause}
              >
                Pause membership
              </Button>
            ) : null}
            {detail.status === "PAUSED" ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={actionPending}
                onClick={onResume}
              >
                Resume membership
              </Button>
            ) : null}
            {detail.status !== "CANCELED" ? (
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                disabled={actionPending}
                onClick={onCancel}
              >
                Cancel membership
              </Button>
            ) : null}
          </div>
        ) : null}
      </>
    );

  if (embedded) {
    return body;
  }

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-elevation-xs",
        className,
      )}
    >
      {!selectedId ? (
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-8">
          <EmptyState
            icon={
              <Crown className="size-5 text-muted-foreground/70" aria-hidden />
            }
            title="Select a membership"
            description="Choose a membership from the list to view plan details and usage."
          />
        </div>
      ) : isLoading || !detail ? (
        <LoadingState label="Loading membership…" className="p-6 py-10" />
      ) : isError ? (
        <ApiErrorState error={error} onRetry={onRetry} />
      ) : (
        body
      )}
    </aside>
  );
}

function InfoBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return <EntityDetailField label={label}>{children}</EntityDetailField>;
}
