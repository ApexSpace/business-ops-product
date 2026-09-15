"use client";

import { CreditCard, Gift, MessageSquare, Pencil } from "lucide-react";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { EmptyState } from "@/components/data-display/empty-state";
import { LoadingState } from "@/components/data-display/loading-state";
import { EntityDetailField } from "@/components/layout/entity-detail-section";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/features/payments/schemas/payment-profile";
import {
  GiftCardVisual,
} from "@/features/gift-cards/components/gift-card-visual";
import type { GiftCardDetail } from "@/features/gift-cards/types";

function transactionLabel(type: string) {
  switch (type) {
    case "INITIAL_VALUE":
      return "Initial value";
    case "REDEMPTION":
      return "Redemption";
    case "REFUND":
      return "Refund";
    case "ADJUSTMENT":
      return "Adjustment";
    case "VOID":
      return "Voided";
    default:
      return type;
  }
}

export interface GiftCardDetailPanelProps {
  selectedId: string | null;
  detail: GiftCardDetail | undefined;
  businessName?: string;
  /** Current business artwork when the card row has no snapshot URL. */
  fallbackArtworkUrl?: string | null;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  onEditNotes: () => void;
  onSend: () => void;
  sendPending: boolean;
  onVoid: () => void;
  voidPending: boolean;
  onOpenContact: (contactId: string) => void;
  className?: string;
  /** In-place edit mode for notes (embedded drawer). */
  editing?: boolean;
  notesDraft?: string;
  onNotesDraftChange?: (value: string) => void;
  /** Drawer = mobile sheet; reserves space for the sheet close button. */
  variant?: "panel" | "drawer";
  /** Renders body only for EntityDetailDrawer (no aside chrome). */
  embedded?: boolean;
}

export function GiftCardDetailPanel({
  selectedId,
  detail,
  businessName,
  fallbackArtworkUrl,
  isLoading,
  isError,
  error,
  onRetry,
  onEditNotes,
  onSend,
  sendPending,
  onVoid,
  voidPending,
  onOpenContact,
  className,
  variant = "panel",
  embedded = false,
  editing = false,
  notesDraft = "",
  onNotesDraftChange,
}: GiftCardDetailPanelProps) {
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
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-drawer-section">Gift card detail</h2>
              <Button
                variant="outline"
                size="sm"
                className={cn(isDrawer && "shrink-0")}
                onClick={onEditNotes}
              >
                <Pencil className="mr-1 size-3.5" />
                Edit
              </Button>
            </div>
          </div>
        ) : null}

        <div
          className={cn(
            "min-h-0 flex-1 space-y-4 overflow-y-auto",
            embedded ? "" : "px-4 py-4",
          )}
        >
            <GiftCardVisual
              businessName={businessName}
              number={detail.number}
              balance={detail.currentBalance}
              status={detail.status}
              artworkUrl={detail.artworkUrl ?? fallbackArtworkUrl}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <InfoBlock label="Owned by">
                <button
                  type="button"
                  className="text-sm font-medium text-primary hover:underline"
                  onClick={() => onOpenContact(detail.ownerContact.id)}
                >
                  {detail.ownerContact.name}
                </button>
              </InfoBlock>
              <InfoBlock label="Purchased by">
                {detail.purchasingContact ? (
                  <button
                    type="button"
                    className="text-sm font-medium text-primary hover:underline"
                    onClick={() =>
                      onOpenContact(detail.purchasingContact!.id)
                    }
                  >
                    {detail.purchasingContact.name}
                  </button>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </InfoBlock>
            </div>

            <InfoBlock label="Note">
              {editing ? (
                <div className="space-y-1.5">
                  <Label className="sr-only">Note</Label>
                  <Textarea
                    value={notesDraft}
                    onChange={(e) => onNotesDraftChange?.(e.target.value)}
                    rows={4}
                    placeholder="Add a note about this gift card…"
                  />
                </div>
              ) : detail.notes?.trim() ? (
                <p className="text-sm">{detail.notes}</p>
              ) : (
                <p className="rounded-lg border border-dashed border-border px-3 py-2.5 text-sm italic text-muted-foreground">
                  No note added yet — click Edit to add one.
                </p>
              )}
              {detail.invoiceId ? (
                <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <CreditCard className="size-3.5 shrink-0" aria-hidden />
                  Payment ref: {detail.invoiceId}
                </p>
              ) : null}
            </InfoBlock>

            <div className="space-y-2">
              <p className="text-drawer-section">History</p>
              {detail.transactions.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                  No activity yet
                </p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Change</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.transactions.map((tx) => {
                        const amount = Number(tx.amount);
                        return (
                          <TableRow key={tx.id}>
                            <TableCell className="text-muted-foreground">
                              {new Date(tx.createdAt).toLocaleDateString(
                                undefined,
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </TableCell>
                            <TableCell>{transactionLabel(tx.type)}</TableCell>
                            <TableCell
                              className={cn(
                                "text-right tabular-nums font-medium",
                                amount >= 0
                                  ? "text-success"
                                  : "text-destructive",
                              )}
                            >
                              {amount >= 0 ? "+" : ""}
                              {formatMoney(tx.amount)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>

        {!embedded ? (
          <div className="shrink-0 space-y-2 border-t border-border px-4 py-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={detail.status !== "ACTIVE" || sendPending}
              onClick={onSend}
            >
              <MessageSquare className="mr-1.5 size-4" />
              Send digital gift card
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              disabled={detail.status === "VOIDED" || voidPending}
              onClick={onVoid}
            >
              Void gift card
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Created{" "}
              {new Date(detail.createdAt).toLocaleString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
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
              <Gift className="size-5 text-muted-foreground/70" aria-hidden />
            }
            title="Select a gift card"
            description="Choose a gift card from the list to view balance and history."
          />
        </div>
      ) : isLoading || !detail ? (
        <LoadingState label="Loading gift card…" className="p-6 py-10" />
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
