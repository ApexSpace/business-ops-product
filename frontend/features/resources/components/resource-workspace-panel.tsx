"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
import { useResourceGroups } from "@/features/resources/hooks/use-resource-groups";
import { useResourceMutations } from "@/features/resources/hooks/use-resource-mutations";
import { useResourceWorkspace } from "@/features/resources/hooks/use-resource-workspace";
import type {
  ResourceAvailabilitySlot,
  ServiceResourceType,
} from "@/features/resources/types";
import {
  normalizeAvailabilitySlots,
  resourceTypeLabel,
  RESOURCE_WEEKDAYS,
} from "@/features/resources/utils/resource-schedule.util";

const RESOURCE_TYPES: ServiceResourceType[] = [
  "ROOM",
  "EQUIPMENT",
  "CONSUMABLE",
];

export function ResourceWorkspacePanel({ resourceId }: { resourceId: string }) {
  const { data, isLoading, isError, error, refetch } =
    useResourceWorkspace(resourceId);
  const { data: groups } = useResourceGroups();
  const mutations = useResourceMutations();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [details, setDetails] = useState({
    name: "",
    resourceType: "ROOM" as ServiceResourceType,
    groupId: "",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE",
  });

  const [slots, setSlots] = useState<ResourceAvailabilitySlot[]>([]);
  const [exceptionDate, setExceptionDate] = useState("");
  const [exceptionReason, setExceptionReason] = useState("");

  useEffect(() => {
    if (!data?.resource) return;
    const resource = data.resource;
    setDetails({
      name: resource.name,
      resourceType: resource.resourceType,
      groupId: resource.groupId ?? "",
      status: resource.status,
    });
    setSlots(normalizeAvailabilitySlots(data.availability));
  }, [data]);

  const linkedServices = useMemo(
    () => data?.linkedServices ?? [],
    [data?.linkedServices],
  );

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading resource…</div>
    );
  }

  if (isError || !data) {
    return (
      <ApiErrorState
        className="m-6"
        error={error}
        title="Could not load resource"
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{data.resource.name}</h2>
            <p className="text-sm text-muted-foreground">
              {resourceTypeLabel(data.resource.resourceType)}
              {data.resource.groupName
                ? ` · ${data.resource.groupName}`
                : ""}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            Delete
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details" className="flex min-h-0 flex-1 flex-col px-6">
        <TabsList className="mt-4 w-full justify-start">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4 flex-1 overflow-y-auto pb-6">
          <div className="grid max-w-lg gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="resource-name">Name</Label>
              <Input
                id="resource-name"
                value={details.name}
                onChange={(e) =>
                  setDetails({ ...details, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={details.resourceType}
                onValueChange={(v) =>
                  setDetails({
                    ...details,
                    resourceType: v as ServiceResourceType,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {resourceTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Group</Label>
              <Select
                value={details.groupId || "__none__"}
                onValueChange={(v) =>
                  setDetails({
                    ...details,
                    groupId: !v || v === "__none__" ? "" : v,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="No group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No group</SelectItem>
                  {(groups ?? []).map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={details.status}
                onValueChange={(v) =>
                  setDetails({
                    ...details,
                    status: v as "ACTIVE" | "INACTIVE",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() =>
                mutations.update.mutate({
                  id: resourceId,
                  body: {
                    name: details.name.trim(),
                    resourceType: details.resourceType,
                    groupId: details.groupId || null,
                    status: details.status,
                  },
                })
              }
              disabled={mutations.update.isPending || !details.name.trim()}
            >
              Save details
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="mt-4 flex-1 overflow-y-auto pb-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-medium">Weekly availability</p>
              <p className="text-xs text-muted-foreground">
                Configure when this resource is available. Booking enforcement is
                coming in a later phase.
              </p>
              {RESOURCE_WEEKDAYS.map((day, index) => {
                const slot = slots[index];
                if (!slot) return null;
                return (
                  <div
                    key={day.key}
                    className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
                  >
                    <label className="flex min-w-[120px] items-center gap-2 text-sm">
                      <Checkbox
                        checked={slot.isEnabled}
                        onCheckedChange={(checked) => {
                          const next = [...slots];
                          next[index] = {
                            ...slot,
                            isEnabled: checked === true,
                          };
                          setSlots(next);
                        }}
                      />
                      {day.label}
                    </label>
                    <Input
                      type="time"
                      className="w-28"
                      disabled={!slot.isEnabled}
                      value={slot.startTime}
                      onChange={(e) => {
                        const next = [...slots];
                        next[index] = { ...slot, startTime: e.target.value,
};
                        setSlots(next);
                      }}
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="time"
                      className="w-28"
                      disabled={!slot.isEnabled}
                      value={slot.endTime}
                      onChange={(e) => {
                        const next = [...slots];
                        next[index] = { ...slot, endTime: e.target.value,
};
                        setSlots(next);
                      }}
                    />
                  </div>
                );
              })}
              <Button
                onClick={() =>
                  mutations.saveAvailability.mutate({
                    resourceId,
                    slots: slots.map((slot) => ({
                      dayOfWeek: slot.dayOfWeek,
                      startTime: slot.startTime,
                      endTime: slot.endTime,
                      isEnabled: slot.isEnabled,
                    })),
                  })
                }
                disabled={mutations.saveAvailability.isPending}
              >
                Save schedule
              </Button>
            </div>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Schedule exceptions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2">
                  {data.scheduleExceptions.map((ex) => (
                    <li
                      key={ex.id}
                      className="flex items-center justify-between rounded border px-3 py-2 text-sm"
                    >
                      <span>
                        {ex.date}
                        {ex.isUnavailable ? " · Unavailable" : ""}
                        {ex.reason ? ` — ${ex.reason}` : ""}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          mutations.removeScheduleException.mutate({
                            resourceId,
                            exceptionId: ex.id,
                          })
                        }
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                  {data.scheduleExceptions.length === 0 ? (
                    <li className="text-sm text-muted-foreground">
                      No exceptions yet.
                    </li>
                  ) : null}
                </ul>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="exception-date">Date</Label>
                    <Input
                      id="exception-date"
                      type="date"
                      value={exceptionDate}
                      onChange={(e) => setExceptionDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1 flex-1 min-w-[200px]">
                    <Label htmlFor="exception-reason">Reason (optional)</Label>
                    <Textarea
                      id="exception-reason"
                      rows={1}
                      value={exceptionReason}
                      onChange={(e) => setExceptionReason(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={() => {
                      if (!exceptionDate) {
                        toast.error("Pick a date");
                        return;
                      }
                      mutations.addScheduleException.mutate(
                        {
                          resourceId,
                          body: {
                            date: exceptionDate,
                            isUnavailable: true,
                            reason: exceptionReason.trim() || null,
                          },
                        },
                        {
                          onSuccess: () => {
                            setExceptionDate("");
                            setExceptionReason("");
                          },
                        },
                      );
                    }}
                    disabled={mutations.addScheduleException.isPending}
                  >
                    Add exception
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="services" className="mt-4 flex-1 overflow-y-auto pb-6">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">Linked services</CardTitle>
            </CardHeader>
            <CardContent>
              {linkedServices.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No services link to this resource yet. Add resource
                  requirements from a service&apos;s Resources tab.
                </p>
              ) : (
                <ul className="space-y-2">
                  {linkedServices.map((link) => (
                    <li
                      key={`${link.source}-${link.requirementId}`}
                      className="flex items-center justify-between rounded border px-3 py-2 text-sm"
                    >
                      <div>
                        <Link
                          href="/business/settings/services"
                          className="font-medium text-primary hover:underline"
                        >
                          {link.serviceName}
                        </Link>
                        <p className="text-muted-foreground">
                          {link.label}
                          {link.optionName ? ` (${link.optionName})` : ""}
                          {" · "}Qty {link.quantity}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {link.source === "service_option"
                          ? "Customization"
                          : "Service"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete resource?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Resources linked to services must be
              unlinked first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                mutations.remove.mutate(resourceId, {
                  onSuccess: () => setConfirmDelete(false),
                })
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
