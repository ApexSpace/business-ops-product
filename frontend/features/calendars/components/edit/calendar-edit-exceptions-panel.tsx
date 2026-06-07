"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCalendarException,
  deleteCalendarException,
  listCalendarExceptions,
} from "@/features/calendars/api/calendars.api";
import { queryKeys } from "@/lib/query/keys";

export function CalendarEditExceptionsPanel({
  calendarId,
}: {
  calendarId: string;
}) {
  const queryClient = useQueryClient();
  const [newDate, setNewDate] = useState("");
  const [reason, setReason] = useState("");

  const { data: exceptions = [], isLoading } = useQuery({
    queryKey: queryKeys.calendars.exceptions(calendarId),
    queryFn: () => listCalendarExceptions(calendarId),
    enabled: !!calendarId,
  });

  const addMutation = useMutation({
    mutationFn: () =>
      createCalendarException(calendarId, {
        date: newDate,
        isUnavailable: true,
        reason: reason.trim() || undefined,
      }),
    onSuccess: async () => {
      toast.success("Blocked date added");
      setNewDate("");
      setReason("");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.calendars.detail(calendarId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.calendars.exceptions(calendarId),
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: (exceptionId: string) =>
      deleteCalendarException(calendarId, exceptionId),
    onSuccess: async () => {
      toast.success("Blocked date removed");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.calendars.detail(calendarId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.calendars.exceptions(calendarId),
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4 rounded-lg border border-dashed p-4">
      <div>
        <h4 className="text-sm font-medium">Blocked dates</h4>
        <p className="text-sm text-muted-foreground">
          Add days when customers cannot book (holidays, closures).
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <Label htmlFor="block-date" className="text-xs">
            Date
          </Label>
          <Input
            id="block-date"
            type="date"
            className="mt-1 w-40"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
          />
        </div>
        <div className="min-w-[160px] flex-1">
          <Label htmlFor="block-reason" className="text-xs">
            Note (optional)
          </Label>
          <Input
            id="block-reason"
            className="mt-1"
            placeholder="Holiday"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!newDate || addMutation.isPending}
          onClick={() => addMutation.mutate()}
        >
          <Plus className="mr-1 size-4" />
          Add
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : exceptions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No blocked dates yet.</p>
      ) : (
        <ul className="space-y-2">
          {exceptions.map((ex) => (
            <li
              key={ex.id}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <span>
                {ex.date}
                {ex.reason ? (
                  <span className="text-muted-foreground"> — {ex.reason}</span>
                ) : null}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-destructive"
                onClick={() => removeMutation.mutate(ex.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
