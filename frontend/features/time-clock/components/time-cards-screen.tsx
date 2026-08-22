"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { DateTime } from "luxon";
import { Clock, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/data-table";
import { EntityDetailDrawer } from "@/components/layout/entity-detail-drawer";
import { EntityDetailFooter } from "@/components/layout/entity-detail-footer";
import { EntityWorkspaceLayout } from "@/components/layout/entity-workspace-layout";
import { ListFilterButton } from "@/components/layout/list-filter-button";
import {
  EntityDetailField,
  EntityDetailFieldGrid,
} from "@/components/layout/entity-detail-section";
import { SearchableSelect } from "@/components/forms/searchable-select";
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
import {
  WORKSPACE_ACTIVE_ROW_CLASS,
  WORKSPACE_TABLE_CLASS,
} from "@/lib/design/workspace-tokens";
import { useEntitySelection } from "@/lib/routing/use-entity-selection";
import { useIsMobile } from "@/lib/hooks/use-mobile";
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
import { TimeCardsMobileList } from "@/features/time-clock/components/mobile/time-cards-mobile-list";
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

type DrawerMode = "view" | "edit";

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
  const isMobile = useIsMobile();
  const { data: business } = useCurrentBusiness();
  const timezone = business?.timezone ?? "UTC";

  const {
    selectedId,
    isOpen,
    setSelectedId,
    clearSelection,
  } = useEntitySelection({ legacyIdParams: ["timeCard"] });

  const [filters, setFilters] = useState<TimeCardsListFilters>({
    page: 1,
    limit: 50,
    timePeriod: "all",
    sortBy: "day",
  });
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("view");
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

  const staffOptions = useMemo(
    () =>
      members.map((member) => ({
        value: member.userId,
        label: memberLabel(member),
      })),
    [members],
  );

  const staffFilterOptions = useMemo(
    () => [
      { value: "all", label: "All Staff" },
      ...staffOptions,
    ],
    [staffOptions],
  );

  const selected = useMemo(
    () => data?.items.find((item) => item.id === selectedId) ?? null,
    [data?.items, selectedId],
  );

  const columns = useMemo<DataTableColumn<TimeCardListItem>[]>(
    () => [
      {
        id: "day",
        header: "Day",
        className: "min-w-[7rem]",
        cell: (row) => <span className="font-medium">{row.dayDisplay}</span>,
      },
      {
        id: "staff",
        header: "Staff",
        className: "min-w-[8rem]",
        cell: (row) => row.staff.name,
      },
      {
        id: "clockIn",
        header: "Clock-in",
        className: "whitespace-nowrap text-muted-foreground",
        cell: (row) => row.clockInTime,
      },
      {
        id: "clockOut",
        header: "Clock-out",
        className: "whitespace-nowrap text-muted-foreground",
        cell: (row) => row.clockOutTime ?? "—",
      },
      {
        id: "paidHours",
        header: "Paid Hours",
        className: "whitespace-nowrap text-right font-medium tabular-nums",
        cell: (row) =>
          row.paidHoursDisplay ??
          formatPaidHoursDisplay(row.paidMinutes) ??
          "—",
      },
    ],
    [],
  );

  const { data: detail, isLoading: detailLoading } = useQuery({
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
      setDrawerMode("view");
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
      setAddOpen(false);
      setSelectedId(created.id);
      setDrawerMode("view");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTimeCard(selected!.id),
    onSuccess: async () => {
      toast.success("Time card deleted");
      await invalidateTimeCardLists(queryClient);
      clearSelection();
      setDrawerMode("view");
      setConfirmDelete(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const startEdit = () => {
    if (!detail) return;
    setEditNotes(detail.notes ?? "");
    setEditClockIn(isoToTimePicker(detail.clockInTimeIso, timezone));
    setEditClockOut(
      detail.clockOutTimeIso
        ? isoToTimePicker(detail.clockOutTimeIso, timezone)
        : emptyTimePicker(),
    );
    setDrawerMode("edit");
  };

  const cancelEdit = () => {
    setDrawerMode("view");
  };

  const openAdd = () => {
    setAddOpen(true);
    setAddStaffId(members[0]?.userId ?? "");
    setAddDate(DateTime.now().setZone(timezone).toFormat("yyyy-MM-dd"));
    setAddClockIn({ hour: "09", minute: "00", period: "AM" });
    setAddClockOut(emptyTimePicker());
    setAddNotes("");
  };

  const total = data?.meta?.total ?? data?.items.length ?? 0;

  return (
    <>
      {isMobile ? (
        isError ? (
          <ApiErrorState error={error} onRetry={() => void refetch()} />
        ) : (
          <TimeCardsMobileList
            cards={data?.items ?? []}
            isLoading={isLoading}
            selectedId={selectedId}
            onSelect={(row) => {
              setDrawerMode("view");
              setSelectedId(row.id);
            }}
            onOpenOptions={() => setOptionsOpen(true)}
            onCreate={openAdd}
          />
        )
      ) : (
      <EntityWorkspaceLayout
        title="Time cards"
        description="Review and manage staff clock-in and clock-out records."
        filters={
          <ListFilterButton
            aria-label="Time card options"
            onClick={() => setOptionsOpen(true)}
          />
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/business/time-clock" />}
            >
              <Clock className="mr-1.5 size-4" />
              Staff kiosk
            </Button>
            <Button size="sm" onClick={openAdd}>
              <Plus className="mr-1.5 size-4" />
              Add time card
            </Button>
          </>
        }
        footer={
          data?.items.length
            ? `${data.items.length} of ${total} time card${total === 1 ? "" : "s"}`
            : undefined
        }
      >
        {isError ? (
          <ApiErrorState error={error} onRetry={() => void refetch()} />
        ) : (
          <DataTable
            className={WORKSPACE_TABLE_CLASS}
            density="compact"
            columns={columns}
            data={data?.items ?? []}
            getRowId={(row) => row.id}
            isLoading={isLoading}
            activeRowId={selectedId}
            onRowClick={(row) => {
              setDrawerMode("view");
              setSelectedId(row.id);
            }}
            getRowClassName={(row) =>
              selectedId === row.id ? WORKSPACE_ACTIVE_ROW_CLASS : undefined
            }
            emptyTitle="No time cards yet"
            emptyDescription="Add a time card or adjust your filters."
            emptyAction={
              <Button size="sm" onClick={openAdd}>
                <Plus className="mr-2 size-4" />
                Add time card
              </Button>
            }
          />
        )}
      </EntityWorkspaceLayout>
      )}

      <EntityDetailDrawer
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            clearSelection();
            setDrawerMode("view");
          }
        }}
        width="standard"
        title={
          drawerMode === "edit"
            ? "Update time card"
            : selected?.staff.name ?? "Time card"
        }
        subtitle={selected?.dayDisplay}
        isLoading={detailLoading}
        headerActions={
          drawerMode === "view" && selected ? (
            <Button variant="outline" size="sm" onClick={startEdit} disabled={!detail}>
              <Pencil className="mr-1 size-3.5" />
              Edit
            </Button>
          ) : drawerMode === "edit" ? (
            <Button variant="ghost" size="sm" onClick={cancelEdit}>
              Cancel
            </Button>
          ) : null
        }
        overflowActions={
          drawerMode === "view" && selected
            ? [
                {
                  id: "delete",
                  label: "Delete",
                  icon: <Trash2 className="mr-2 size-4" />,
                  destructive: true,
                  onSelect: () => setConfirmDelete(true),
                },
              ]
            : undefined
        }
        footer={
          drawerMode === "edit" ? (
            <EntityDetailFooter>
              <Button
                className="min-h-[2.75rem] w-full sm:w-auto sm:min-w-[10rem]"
                disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                Save changes
              </Button>
            </EntityDetailFooter>
          ) : null
        }
      >
        {selected && drawerMode === "view" ? (
          <EntityDetailFieldGrid>
            <EntityDetailField label="Staff">{selected.staff.name}</EntityDetailField>
            <EntityDetailField label="Day">{selected.dayDisplay}</EntityDetailField>
            <EntityDetailField label="Clock-in">{selected.clockInTime}</EntityDetailField>
            <EntityDetailField label="Clock-out">
              {selected.clockOutTime ?? "—"}
            </EntityDetailField>
            <EntityDetailField label="Hours">
              {selected.paidHoursDisplay
                ? `${selected.paidHoursDisplay} (paid)`
                : "—"}
            </EntityDetailField>
            <EntityDetailField label="Notes">
              {selected.notes || "—"}
            </EntityDetailField>
          </EntityDetailFieldGrid>
        ) : null}

        {selected && drawerMode === "edit" ? (
          <div className="space-y-4">
            <EntityDetailFieldGrid>
              <EntityDetailField label="Staff">{selected.staff.name}</EntityDetailField>
              <EntityDetailField label="Day">{selected.dayDisplay}</EntityDetailField>
            </EntityDetailFieldGrid>
            <div className="space-y-1.5">
              <Label>Clock-in</Label>
              <TimePickerField value={editClockIn} onChange={setEditClockIn} />
            </div>
            <div className="space-y-1.5">
              <Label>Clock-out</Label>
              <TimePickerField
                value={editClockOut}
                onChange={setEditClockOut}
                placeholder="Select time"
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
          </div>
        ) : null}
      </EntityDetailDrawer>

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent side="right" className="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Add time card</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 px-1 pt-4">
            <div className="space-y-1.5">
              <Label>Staff</Label>
              <SearchableSelect
                items={staffOptions}
                value={addStaffId || null}
                onValueChange={(value) => setAddStaffId(value ?? "")}
                placeholder="Select staff"
                searchPlaceholder="Search staff…"
              />
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
                placeholder="Select time"
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
            <Button
              className="w-full"
              disabled={addMutation.isPending}
              onClick={() => addMutation.mutate()}
            >
              Add time card
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={optionsOpen} onOpenChange={setOptionsOpen}>
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
                <SearchableSelect
                  items={staffFilterOptions}
                  value={filters.staffId ?? "all"}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      staffId:
                        value === "all" || value == null ? undefined : value,
                      page: 1,
                    }))
                  }
                  placeholder="All Staff"
                  searchable
                  searchPlaceholder="Search staff…"
                />
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
    </>
  );
}
