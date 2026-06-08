"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSnapshotEditor } from "@/features/platform/hooks/use-snapshot-editor";
import type { SnapshotCalendarAsset } from "@/features/platform/types/snapshot";

function newSourceKey() {
  return `calendar-${crypto.randomUUID().slice(0, 8)}`;
}

export function CalendarsBuilder() {
  const { assets, updateAssets, canManage } = useSnapshotEditor();
  const calendars = assets?.calendars ?? [];

  const updateCalendars = (next: SnapshotCalendarAsset[]) => {
    updateAssets({ calendars: next });
  };

  const addCalendar = () => {
    updateCalendars([
      ...calendars,
      {
        sourceKey: newSourceKey(),
        name: "New calendar",
        availabilityTemplate: {
          monday: { enabled: true, start: "09:00", end: "17:00" },
          tuesday: { enabled: true, start: "09:00", end: "17:00" },
          wednesday: { enabled: true, start: "09:00", end: "17:00" },
          thursday: { enabled: true, start: "09:00", end: "17:00" },
          friday: { enabled: true, start: "09:00", end: "17:00" },
        },
      },
    ]);
  };

  const updateCalendar = (
    sourceKey: string,
    patch: Partial<SnapshotCalendarAsset>,
  ) => {
    updateCalendars(
      calendars.map((c) => (c.sourceKey === sourceKey ? { ...c, ...patch } : c)),
    );
  };

  const removeCalendar = (sourceKey: string) => {
    updateCalendars(calendars.filter((c) => c.sourceKey !== sourceKey));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Calendar templates</CardTitle>
          <CardDescription>
            Default booking calendars and availability patterns for new businesses.
          </CardDescription>
        </div>
        {canManage ? (
          <Button type="button" size="sm" onClick={addCalendar}>
            <Plus className="mr-2 size-4" />
            Add calendar
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {calendars.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No calendar templates yet. Add one to define default availability.
          </p>
        ) : (
          calendars.map((calendar) => (
            <div key={calendar.sourceKey} className="rounded-md border p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={calendar.name}
                  disabled={!canManage}
                  onChange={(e) =>
                    updateCalendar(calendar.sourceKey, { name: e.target.value })
                  }
                  className="max-w-sm font-medium"
                  placeholder="Calendar name"
                />
                {canManage ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCalendar(calendar.sourceKey)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Availability template (JSON)
                </Label>
                <Textarea
                  value={JSON.stringify(calendar.availabilityTemplate ?? {}, null, 2)}
                  disabled={!canManage}
                  rows={6}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      updateCalendar(calendar.sourceKey, {
                        availabilityTemplate: parsed,
                      });
                    } catch {
                      // allow typing; commit on valid JSON blur handled below
                    }
                  }}
                  onBlur={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      updateCalendar(calendar.sourceKey, {
                        availabilityTemplate: parsed,
                      });
                    } catch {
                      // keep previous value
                    }
                  }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
