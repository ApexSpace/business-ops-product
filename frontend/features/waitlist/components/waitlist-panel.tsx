"use client";

import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import { ArrowLeft, Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DrawerShell } from "@/components/layout/drawer-shell";
import { WaitlistEntryDetail } from "@/features/waitlist/components/waitlist-entry-detail";
import { useWaitlistList } from "@/features/waitlist/hooks/use-waitlist-list";
import type { WaitlistEntry } from "@/features/waitlist/types";
import { cn } from "@/lib/utils";

interface WaitlistPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Calendar date used when the user opts into filtering by date. */
  anchorDateKey?: string;
  staffId?: string;
  calendarId?: string;
  timezone?: string;
  onBooked?: (appointmentId: string) => void;
}

function formatRelativeTime(iso: string): string {
  const dt = DateTime.fromISO(iso);
  if (!dt.isValid) return "";
  return dt.toRelative() ?? "";
}

function WaitlistEntryRow({
  entry,
  timezone,
  selected,
  onSelect,
}: {
  entry: WaitlistEntry;
  timezone: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const dateLabel = DateTime.fromISO(entry.preferredDate, {
    zone: timezone,
  }).toFormat("ccc, LLL d");

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full cursor-pointer rounded-[var(--radius-xl)] border border-transparent px-3.5 py-3 text-left transition-colors",
        "hover:bg-muted/50",
        selected && "border-border bg-muted/40 shadow-sm",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-[14px] font-semibold tracking-tight">
          {entry.contact.name}
        </p>
        {entry.hasOpening ? (
          <span className="shrink-0 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800">
            Opening
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-[13px] text-muted-foreground">{dateLabel}</p>
      <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-muted-foreground">
        {entry.service.name}
        {entry.staff ? ` · ${entry.staff.name}` : " · Anyone"}
      </p>
      <p className="mt-2 text-[11.5px] text-muted-foreground/80">
        Added {formatRelativeTime(entry.createdAt)}
      </p>
    </button>
  );
}

export function WaitlistPanel({
  open,
  onOpenChange,
  anchorDateKey,
  staffId,
  calendarId,
  timezone = "UTC",
  onBooked,
}: WaitlistPanelProps) {
  const [hasOpeningOnly, setHasOpeningOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Mobile: list vs detail. Desktop always shows both panes. */
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  /** Date filter is opt-in — do not lock the panel to the calendar day. */
  const [dateFilter, setDateFilter] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    setDateFilter(undefined);
    setHasOpeningOnly(false);
    setSelectedId(null);
    setMobileShowDetail(false);
  }, [open]);

  const filters = useMemo(
    () => ({
      preferredDate: dateFilter,
      staffId: staffId || undefined,
      calendarId: calendarId || undefined,
      hasOpening: hasOpeningOnly || undefined,
      limit: 50,
    }),
    [dateFilter, staffId, calendarId, hasOpeningOnly],
  );

  const { data, isLoading } = useWaitlistList(filters);
  const entries = data?.items ?? [];
  const selectedEntry =
    entries.find((entry) => entry.id === selectedId) ?? entries[0] ?? null;
  const entryCount = data?.meta.total ?? entries.length;

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      width="split"
      title="Waitlist"
      description={
        entryCount === 1
          ? "1 client waiting for an opening"
          : `${entryCount} clients waiting for an opening`
      }
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden !p-0"
      contentClassName="flex min-h-0 flex-1 flex-col !px-0 !py-0"
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border/70 px-[30px] py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {dateFilter ? (
            <Badge variant="secondary" className="gap-1.5 py-1 pl-2.5 pr-1">
              <span>
                {DateTime.fromISO(dateFilter, { zone: timezone }).toFormat(
                  "LLL d, yyyy",
                )}
              </span>
              <button
                type="button"
                className="rounded-md p-0.5 hover:bg-muted"
                aria-label="Clear date filter"
                onClick={() => setDateFilter(undefined)}
              >
                <X className="size-3.5 opacity-60" />
              </button>
            </Badge>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2.5 text-[13px] text-muted-foreground"
              disabled={!anchorDateKey}
              onClick={() => setDateFilter(anchorDateKey)}
            >
              + Filter by calendar date
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <Switch
            id="waitlist-has-opening"
            checked={hasOpeningOnly}
            onCheckedChange={setHasOpeningOnly}
          />
          <Label
            htmlFor="waitlist-has-opening"
            className="text-[13px] font-medium text-muted-foreground"
          >
            Has opening
          </Label>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
        {/* List pane */}
        <div
          className={cn(
            "flex min-h-0 flex-col border-border/70 lg:border-r",
            mobileShowDetail ? "hidden lg:flex" : "flex",
          )}
        >
          <div className="shrink-0 px-5 pb-2 pt-4 lg:px-6">
            <p className="text-[12.5px] font-semibold uppercase tracking-wide text-muted-foreground">
              Entries
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4 scrollbar-thin lg:px-4">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : entries.length === 0 ? (
              <div className="px-3 py-16 text-center">
                <p className="text-[14px] font-medium">No waitlist entries</p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  No clients match these filters.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {entries.map((entry) => (
                  <WaitlistEntryRow
                    key={entry.id}
                    entry={entry}
                    timezone={timezone}
                    selected={selectedEntry?.id === entry.id}
                    onSelect={() => {
                      setSelectedId(entry.id);
                      setMobileShowDetail(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detail pane */}
        <div
          className={cn(
            "flex min-h-0 flex-col bg-background",
            mobileShowDetail ? "flex" : "hidden lg:flex",
          )}
        >
          <div className="shrink-0 border-b border-border/60 px-4 py-3 lg:hidden">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 text-[13px]"
              onClick={() => setMobileShowDetail(false)}
            >
              <ArrowLeft className="size-4" />
              Back to list
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 scrollbar-thin lg:px-7 lg:py-6">
            {selectedEntry ? (
              <WaitlistEntryDetail
                entry={selectedEntry}
                timezone={timezone}
                calendarId={calendarId}
                onBooked={onBooked}
              />
            ) : (
              <div className="flex h-full min-h-[200px] items-center justify-center px-6 text-center">
                <div>
                  <p className="text-[14px] font-medium">Select an entry</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Choose a client from the list to review openings and book.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DrawerShell>
  );
}
