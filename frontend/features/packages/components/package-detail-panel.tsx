"use client";

import { Boxes, MoreHorizontal, Pencil } from "lucide-react";
import { DateTime } from "luxon";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { EmptyState } from "@/components/data-display/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type {
  ClientPackageDetail,
  PackageHistoryEventType,
} from "@/features/packages/types";

export function packageDisplayName(detail: {
  packageTemplate: { name: string; emoji: string | null };
}) {
  const emoji = detail.packageTemplate.emoji ?? "";
  return `${emoji} ${detail.packageTemplate.name}`.trim();
}

function formatDetailDate(value: string) {
  return DateTime.fromISO(value).toFormat("MMMM d, yyyy");
}

function historyEventLabel(type: PackageHistoryEventType) {
  switch (type) {
    case "PURCHASED":
      return "Purchased";
    case "REDEEMED":
      return "Redeemed";
    case "ADJUSTED":
      return "Adjusted";
    case "TRANSFERRED_IN":
      return "Transferred in";
    case "TRANSFERRED_OUT":
      return "Transferred out";
    case "EXPIRED":
      return "Expired";
    case "DELETED":
      return "Deleted";
    default:
      return type;
  }
}

export interface PackageDetailPanelProps {
  selectedId: string | null;
  detail: ClientPackageDetail | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  onDelete: () => void;
  onTransfer: () => void;
  onStartAdjust: () => void;
  adjustMode: boolean;
  allocationDraft: Record<string, number>;
  onAllocationChange: (serviceId: string, remaining: number) => void;
  onCancelAdjust: () => void;
  onSaveAdjust: () => void;
  adjustPending: boolean;
  onEditExpiration: () => void;
  onOpenContact: (contactId: string) => void;
  className?: string;
  variant?: "panel" | "drawer";
}

export function PackageDetailPanel({
  selectedId,
  detail,
  isLoading,
  isError,
  error,
  onRetry,
  onDelete,
  onTransfer,
  onStartAdjust,
  adjustMode,
  allocationDraft,
  onAllocationChange,
  onCancelAdjust,
  onSaveAdjust,
  adjustPending,
  onEditExpiration,
  onOpenContact,
  className,
  variant = "panel",
}: PackageDetailPanelProps) {
  const isDrawer = variant === "drawer";

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
              <Boxes className="size-5 text-muted-foreground/70" aria-hidden />
            }
            title="Select a package"
            description="Add a new client package or choose one from the list to view details."
          />
        </div>
      ) : isLoading || !detail ? (
        <p className="p-6 text-sm text-muted-foreground">Loading package…</p>
      ) : isError ? (
        <ApiErrorState error={error} onRetry={onRetry} />
      ) : (
        <>
          <div
            className={cn(
              "shrink-0 border-b border-border px-4 py-3",
              isDrawer && "pr-14",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-drawer-section">Package detail</h2>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(isDrawer && "shrink-0")}
                    >
                      <MoreHorizontal className="size-4" />
                      <span className="sr-only">Package actions</span>
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={onTransfer}>
                    Transfer
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onStartAdjust}>
                    Adjust quantities
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={onDelete}>
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div className="space-y-1">
              <p className="text-lg font-semibold tracking-tight">
                {packageDisplayName(detail)}
              </p>
              {detail.isDemo ? (
                <Badge variant="secondary">Demo</Badge>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <InfoBlock label="Client">
                <button
                  type="button"
                  className="text-sm font-medium text-primary hover:underline"
                  onClick={() => onOpenContact(detail.contact.id)}
                >
                  {detail.contact.name}
                </button>
              </InfoBlock>
              <InfoBlock label="Purchase date">
                <p className="text-sm">{formatDetailDate(detail.purchaseDate)}</p>
              </InfoBlock>
            </div>

            <InfoBlock label="Expiration date">
              <div className="flex items-center gap-2">
                <p className="text-sm">
                  {detail.expirationDate
                    ? formatDetailDate(detail.expirationDate)
                    : "No expiration date"}
                </p>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onEditExpiration}
                  aria-label="Edit expiration date"
                >
                  <Pencil className="size-3.5" />
                </Button>
              </div>
            </InfoBlock>

            <div className="space-y-2">
              <p className="text-drawer-section">Services remaining</p>
              <div className="overflow-hidden rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Service</TableHead>
                      <TableHead className="text-right"># Remaining</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.serviceAllocations.map((allocation) => (
                      <TableRow key={allocation.serviceId}>
                        <TableCell>{allocation.serviceName}</TableCell>
                        <TableCell className="text-right">
                          {adjustMode ? (
                            <Input
                              type="number"
                              min={0}
                              className="ml-auto h-8 w-20 text-right tabular-nums"
                              value={
                                allocationDraft[allocation.serviceId] ??
                                allocation.remaining
                              }
                              onChange={(e) =>
                                onAllocationChange(
                                  allocation.serviceId,
                                  Number(e.target.value),
                                )
                              }
                            />
                          ) : (
                            <span className="tabular-nums">
                              {allocation.remaining}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {adjustMode ? (
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={onCancelAdjust}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={adjustPending}
                    onClick={onSaveAdjust}
                  >
                    Save
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <p className="text-drawer-section">History</p>
              {detail.history.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                  No activity yet
                </p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Date</TableHead>
                        <TableHead>Event</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.history.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {formatDetailDate(event.createdAt)}
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">
                              {historyEventLabel(event.eventType)}
                            </span>
                            {event.description ? (
                              <span className="text-muted-foreground">
                                {" "}
                                — {event.description}
                              </span>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </>
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
  return (
    <div className="space-y-1.5">
      <p className="text-drawer-section">{label}</p>
      <div>{children}</div>
    </div>
  );
}
