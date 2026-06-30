"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { DateTime } from "luxon";
import { Filter, MoreHorizontal, Pencil, Plus, Timer } from "lucide-react";
import { toast } from "sonner";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/query/keys";
import { invalidateTimeCardLists } from "@/lib/query/invalidation";
import { listBusinessMembers } from "@/features/settings/api/business.api";
import { useCurrentBusiness } from "@/features/settings/hooks/use-current-business";
import {
  createTimeCard,
  deleteTimeCard,
  getTimeCard,
  listTimeCards,
  updateTimeCard,
} from "@/features/time-clock/api/time-cards.api";
import { TimePickerField } from "@/features/time-clock/components/time-picker-field";
import type {
  TimeCardListItem,
  TimeCardsListFilters,
} from "@/features/time-clock/types";
import { formatPaidHoursDisplay } from "@/features/time-clock/utils/paid-hours";
import {
  emptyTimePicker,
  isoToTimePicker,
  timePickerToHm,
  type TimePickerValue,
} from "@/features/time-clock/utils/time-picker";

type PanelMode = "empty" | "view" | "edit" | "add" | "options";

function memberLabel(member: {
  user: { firstName?: string | null; lastName?: string | null; email: string };
}) {
  const name = [member.user.firstName, member.user.lastName]
    .filter(Boolean)
    .join(" ");
  return name || member.user.email;
}

export function TimeCardsScreen() {
  const queryClient = useQueryClient();
  const { data: business } = useCurrentBusiness();
  const timezone = business?.timezone ?? "UTC";

  const [filters, setFilters] = useState<TimeCardsListFilters>({
    page: 1,
    limit: 50,
    timePeriod: "all",
    sortBy: "day",
  });
  const [panelMode, setPanelMode] = useState<PanelMode>("empty");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [editClockIn, setEditClockIn] = useState<TimePickerValue>(emptyTimePicker());
  const [editClockOut, setEditClockOut] = useState<TimePickerValue>(emptyTimePicker());
  const [editNotes, setEditNotes] = useState("");
  const [addStaffId, setAddStaffId] = useState("");
  const [addDate, setAddDate] = useState(
    DateTime.now().setZone(timezone).toFormat("yyyy-MM-dd"),
  );
  const [addClockIn, setAddClockIn] = useState<TimePickerValue>({
    hour: "09",
    minute: "00",
    period: "AM",
  });
  const [addClockOut, setAddClockOut] = useState<TimePickerValue>(emptyTimePicker());
  const [addNotes, setAddNotes] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.timeClock.cards.list(filters),
    queryFn: () => listTimeCards(filters),
  });

  const { data: membersData } = useQuery({
    queryKey: queryKeys.business.members({ page: 1, limit: 100 }),
    queryFn: () => listBusinessMembers({ page: 1, limit: 100 }),
  });

  const members = membersData?.items ?? [];
  const selected = useMemo(
    () => data?.items.find((item) => item.id === selectedId) ?? null,
    [data?.items, selectedId],
  );

  const { data: detail } = useQuery({
    queryKey: queryKeys.timeClock.cards.detail(selectedId ?? ""),
    queryFn: () => getTimeCard(selectedId!),
    enabled: Boolean(selectedId),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const clockInTime = timePickerToHm(editClockIn);
      if (!clockInTime) throw new Error("Clock-in time is required");
      const clockOutHm = timePickerToHm(editClockOut);
      return updateTimeCard(selected.id, {
        clockInTime,
        clockOutTime: clockOutHm ?? undefined,
        notes: editNotes,
      });
    },
    onSuccess: async () => {
      toast.success("Time card updated");
      await invalidateTimeCardLists(queryClient);
      setPanelMode("view");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const clockInTime = timePickerToHm(addClockIn);
      if (!addStaffId || !addDate || !clockInTime) {
        throw new Error("Staff, date, and clock-in are required");
      }
      const clockOutTime = timePickerToHm(addClockOut);
      return createTimeCard({
        staffId: addStaffId,
        date: addDate,
        clockInTime,
        clockOutTime: clockOutTime ?? undefined,
        notes: addNotes || undefined,
      });
    },
    onSuccess: async (created) => {
      toast.success("Time card added");
      await invalidateTimeCardLists(queryClient);
      setSelectedId(created.id);
      setPanelMode("view");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTimeCard(selected!.id),
    onSuccess: async () => {
      toast.success("Time card deleted");
      await invalidateTimeCardLists(queryClient);
      setSelectedId(null);
      setPanelMode("empty");
      setConfirmDelete(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openView = (item: TimeCardListItem) => {
    setSelectedId(item.id);
    setPanelMode("view");
    setEditNotes(item.notes ?? "");
  };

  const startEdit = () => {
    if (!detail) return;
    setEditNotes(detail.notes ?? "");
    setEditClockIn(isoToTimePicker(detail.clockInTimeIso, timezone));
    setEditClockOut(
      detail.clockOutTimeIso
        ? isoToTimePicker(detail.clockOutTimeIso, timezone)
        : emptyTimePicker(),
    );
    setPanelMode("edit");
  };

  const openAdd = () => {
    setPanelMode("add");
    setSelectedId(null);
    setAddStaffId(members[0]?.userId ?? "");
    setAddDate(DateTime.now().setZone(timezone).toFormat("yyyy-MM-dd"));
    setAddClockIn({ hour: "09", minute: "00", period: "AM" });
    setAddClockOut(emptyTimePicker());
    setAddNotes("");
  };

  const closePanel = () => {
    if (selected) setPanelMode("view");
    else setPanelMode("empty");
  };

  const showSidePanel = panelMode !== "empty" && panelMode !== "options";

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[520px] overflow-hidden rounded-lg border bg-card">
      <div className={cn("flex min-w-0 flex-1 flex-col", showSidePanel && "border-r")}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <Button onClick={openAdd}>
            <Plus className="mr-2 size-4" />
            Add Time Card
          </Button>
          <Button
            variant="ghost"
            onClick={() => setPanelMode("options")}
          >
            <Filter className="mr-2 size-4" />
            Options
          </Button>
        </div>

        {isError ? (
          <ApiErrorState error={error} onRetry={() => void refetch()} />
        ) : (
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/50 text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="px-4 py-2 font-medium">Day</th>
                  <th className="px-4 py-2 font-medium">Staff</th>
                  <th className="px-4 py-2 font-medium">Clock-in</th>
                  <th className="px-4 py-2 font-medium">Clock-out</th>
                  <th className="px-4 py-2 font-medium">Paid Hours</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : null}
                {!isLoading && (data?.items.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No time cards yet.
                    </td>
                  </tr>
                ) : null}
                {data?.items.map((item) => (
                  <tr
                    key={item.id}
                    className={cn(
                      "cursor-pointer border-b hover:bg-muted/30",
                      selectedId === item.id && "bg-primary/5",
                    )}
                    onClick={() => openView(item)}
                  >
                    <td className="px-4 py-3">{item.dayDisplay}</td>
                    <td className="px-4 py-3">{item.staff.name}</td>
                    <td className="px-4 py-3">{item.clockInTime}</td>
                    <td className="px-4 py-3">{item.clockOutTime ?? ""}</td>
                    <td className="px-4 py-3">
                      {item.paidHoursDisplay ??
                        formatPaidHoursDisplay(item.paidMinutes) ??
                        ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {panelMode === "empty" ? (
        <aside className="hidden w-80 shrink-0 flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground lg:flex">
          <Timer className="size-10 opacity-40" />
          <p className="text-sm">
            Click on a time card to see details or add a new one.
          </p>
        </aside>
      ) : null}

      {showSidePanel ? (
        <aside className="flex w-full max-w-sm shrink-0 flex-col border-l bg-background lg:w-80">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-semibold">
              {panelMode === "add"
                ? "Add Time Card"
                : panelMode === "edit"
                  ? "Update Time Card"
                  : "Time Card"}
            </h2>
            {panelMode === "edit" || panelMode === "add" ? (
              <Button variant="ghost" size="sm" onClick={closePanel}>
                CANCEL
              </Button>
            ) : (
              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <IconButton aria-label="Time card actions">
                        <MoreHorizontal className="size-4" />
                      </IconButton>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setConfirmDelete(true)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={startEdit}
                  disabled={!detail}
                >
                  <Pencil className="size-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-4 overflow-auto p-4">
            {panelMode === "view" && selected ? (
              <>
                <Field label="Staff" value={selected.staff.name} />
                <Field label="Day" value={selected.dayDisplay} />
                <Field label="Clock-in" value={selected.clockInTime} />
                <Field
                  label="Clock-out"
                  value={selected.clockOutTime ?? "—"}
                />
                <Field
                  label="Hours"
                  value={
                    selected.paidHoursDisplay
                      ? `${selected.paidHoursDisplay} (paid)`
                      : "—"
                  }
                />
                <Field label="Notes" value={selected.notes || "—"} />
              </>
            ) : null}

            {panelMode === "edit" && selected ? (
              <>
                <Field label="Staff" value={selected.staff.name} />
                <Field label="Day" value={selected.dayDisplay} />
                <div className="space-y-1.5">
                  <Label>Clock-in</Label>
                  <TimePickerField value={editClockIn} onChange={setEditClockIn} />
                </div>
                <div className="space-y-1.5">
                  <Label>Clock-out</Label>
                  <TimePickerField
                    value={editClockOut}
                    onChange={setEditClockOut}
                    placeholder="Select Time"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Input
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Enter notes"
                  />
                </div>
              </>
            ) : null}

            {panelMode === "add" ? (
              <>
                <div className="space-y-1.5">
                  <Label>Staff</Label>
                  <Select value={addStaffId} onValueChange={setAddStaffId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.userId} value={member.userId}>
                          {memberLabel(member)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={addDate}
                    onChange={(e) => setAddDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Clock-in</Label>
                  <TimePickerField value={addClockIn} onChange={setAddClockIn} />
                </div>
                <div className="space-y-1.5">
                  <Label>Clock-out</Label>
                  <TimePickerField
                    value={addClockOut}
                    onChange={setAddClockOut}
                    placeholder="Select Time"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Input
                    value={addNotes}
                    onChange={(e) => setAddNotes(e.target.value)}
                    placeholder="Enter notes"
                  />
                </div>
              </>
            ) : null}
          </div>

          {panelMode === "edit" ? (
            <div className="border-t p-4">
              <Button
                className="w-full"
                disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                SAVE CHANGES
              </Button>
            </div>
          ) : null}
          {panelMode === "add" ? (
            <div className="border-t p-4">
              <Button
                className="w-full"
                disabled={addMutation.isPending}
                onClick={() => addMutation.mutate()}
              >
                ADD TIME CARD
              </Button>
            </div>
          ) : null}
        </aside>
      ) : null}

      <Sheet open={panelMode === "options"} onOpenChange={(open) => !open && setPanelMode(selected ? "view" : "empty")}>
        <SheetContent side="right" className="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Options</SheetTitle>
          </SheetHeader>
          <div className="space-y-6 px-1 pt-4">
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Filters
              </p>
              <div className="space-y-1.5">
                <Label>Staff</Label>
                <Select
                  value={filters.staffId ?? "all"}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      staffId: value === "all" ? undefined : value,
                      page: 1,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Staff</SelectItem>
                    {members.map((member) => (
                      <SelectItem key={member.userId} value={member.userId}>
                        {memberLabel(member)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Time period</Label>
                <Select
                  value={filters.timePeriod ?? "all"}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      timePeriod: value as TimeCardsListFilters["timePeriod"],
                      page: 1,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="this_week">This Week</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Rows
              </p>
              <div className="space-y-1.5">
                <Label>Sort by</Label>
                <Select
                  value={filters.sortBy ?? "day"}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      sortBy: value as TimeCardsListFilters["sortBy"],
                      page: 1,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete time card?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
