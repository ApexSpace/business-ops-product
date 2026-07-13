"use client";

import { useMemo, useState } from "react";
import { DateTime } from "luxon";
import { Loader2, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useWaitlistList } from "@/features/waitlist/hooks/use-waitlist-list";
import { WaitlistEntryDetail } from "@/features/waitlist/components/waitlist-entry-detail";
import type { WaitlistEntry } from "@/features/waitlist/types";
import { cn } from "@/lib/utils";

interface WaitlistPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  const dateLabel = DateTime.fromISO(entry.preferredDate, { zone: timezone }).toFormat(
    "cccc, LLL d",
  );

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/40",
        selected && "border-primary bg-muted/30",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{entry.contact.name}</p>
          {entry.hasOpening ? (
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
              Opening available
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{dateLabel}</p>
        <p className="text-sm text-muted-foreground">
          {entry.service.name}
          {entry.staff ? ` with ${entry.staff.name}` : " with Anyone"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          added {formatRelativeTime(entry.createdAt)}
        </p>
      </div>
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

  const filters = useMemo(
    () => ({
      preferredDate: anchorDateKey,
      staffId,
      calendarId,
      hasOpening: hasOpeningOnly || undefined,
      limit: 50,
    }),
    [anchorDateKey, staffId, calendarId, hasOpeningOnly],
  );

  const { data, isLoading } = useWaitlistList(filters);
  const entries = data?.items ?? [];
  const selectedEntry =
    entries.find((entry) => entry.id === selectedId) ?? entries[0] ?? null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b px-4 py-4">
          <SheetTitle>Waitlist</SheetTitle>
        </SheetHeader>

        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="flex items-center gap-2">
            {anchorDateKey ? (
              <Badge variant="secondary" className="gap-1">
                Date: {DateTime.fromISO(anchorDateKey, { zone: timezone }).toFormat("LLL d")}
                <button
                  type="button"
                  className="rounded-sm hover:bg-muted"
                  aria-label="Clear date filter"
                  onClick={() => undefined}
                >
                  <X className="size-3 opacity-60" />
                </button>
              </Badge>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="waitlist-has-opening"
              checked={hasOpeningOnly}
              onCheckedChange={setHasOpeningOnly}
            />
            <Label htmlFor="waitlist-has-opening" className="text-sm">
              Has opening
            </Label>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2">
          <div className="min-h-0 overflow-y-auto border-b p-3 md:border-b-0 md:border-r">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">
                Entries ({data?.meta.total ?? entries.length})
              </p>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : entries.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No waitlist entries match these filters.
              </p>
            ) : (
              <div className="space-y-2">
                {entries.map((entry) => (
                  <WaitlistEntryRow
                    key={entry.id}
                    entry={entry}
                    timezone={timezone}
                    selected={selectedEntry?.id === entry.id}
                    onSelect={() => setSelectedId(entry.id)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="min-h-0 overflow-y-auto p-3">
            {selectedEntry ? (
              <WaitlistEntryDetail
                entry={selectedEntry}
                timezone={timezone}
                calendarId={calendarId}
                onBooked={onBooked}
              />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Select a waitlist entry to view details.
              </p>
            )}
          </div>
        </div>

        <div className="border-t px-4 py-3 md:hidden">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
