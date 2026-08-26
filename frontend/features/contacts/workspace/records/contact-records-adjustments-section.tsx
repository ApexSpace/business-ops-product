"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2  } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/data-display/empty-state";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconButton } from "@/components/ui/icon-button";
import {
  createContactAdjustment,
  deleteContactAdjustment,
  listContactAdjustments,
} from "@/features/contacts/api/contact-workspace.api";
import { listServices } from "@/features/settings/api/services.api";
import { DURATION_PRESETS } from "@/features/calendars/schemas/calendar-profile";
import { RecordListEmpty } from "@/features/contacts/components/contact-workspace/contact-record-section";
import { invalidateContactWorkspace } from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import type { ContactRecordsSectionProps } from "@/features/contacts/workspace/records/contact-records-types";

function formatDuration(minutes: number): string {
  const preset = DURATION_PRESETS.find((p) => p.value === minutes);
  if (preset) return preset.label;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} hr ${m} min`;
  if (h) return `${h} hr`;
  return `${m} min`;
}

export function ContactRecordsAdjustmentsSection({ contact }: ContactRecordsSectionProps) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");

  const { data: adjustments = [], isLoading } = useQuery({
    queryKey: queryKeys.contacts.adjustments(contact.id),
    queryFn: () => listContactAdjustments(contact.id),
  });

  const { data: servicesData } = useQuery({
    queryKey: queryKeys.services.list({ page: 1, limit: 100, status: "ACTIVE" }),
    queryFn: () => listServices({ page: 1, limit: 100, status: "ACTIVE" }),
    enabled: createOpen,
  });

  const serviceItems = useMemo(
    () =>
      (servicesData?.items ?? []).map((service) => ({
        value: service.id,
        label: service.name,
      })),
    [servicesData],
  );

  const durationItems = useMemo(
    () =>
      DURATION_PRESETS.map((preset) => ({
        value: String(preset.value),
        label: preset.label,
      })),
    [],
  );

  const createMutation = useMutation({
    mutationFn: () =>
      createContactAdjustment(contact.id, {
        serviceId,
        durationMinutes: Number(durationMinutes),
      }),
    onSuccess: () => {
      toast.success("Custom duration added");
      void invalidateContactWorkspace(queryClient, contact.id);
      setCreateOpen(false);
      setServiceId("");
      setDurationMinutes("60");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (adjustmentId: string) =>
      deleteContactAdjustment(contact.id, adjustmentId),
    onSuccess: () => {
      toast.success("Adjustment removed");
      void invalidateContactWorkspace(queryClient, contact.id);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <RecordListEmpty message="Loading adjustments…" />;

  return (
    <div className="space-y-4">
      <p className="text-[13px] leading-5 text-muted-foreground">
        Set client-specific service durations applied when staff book appointments.
        These do not apply to online booking yet.
      </p>

      <ActionButton
        size="sm"
        className="h-9 rounded-[10px] px-3 text-[12.5px] font-semibold"
        onClick={() => setCreateOpen(true)}
      >
        Add custom duration
      </ActionButton>

      {adjustments.length === 0 ? (
        <EmptyState
          compact
          title="No custom durations"
          description="Add a duration override for services this client needs extra time for."
          className="py-8"
        />
      ) : (
        <ul className="space-y-2">
          {adjustments.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between rounded-[12px] border border-border/70 bg-background/80 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">{row.serviceName}</p>
                <p className="text-[12.5px] text-muted-foreground">
                  Duration: {formatDuration(row.durationMinutes)}
                </p>
              </div>
              <IconButton
                aria-label="Remove adjustment"
                className="text-destructive"
                onClick={() => deleteMutation.mutate(row.id)}
              >
                <Trash2 className="size-4" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add custom duration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Service</Label>
              <Select
                items={serviceItems}
                value={serviceId}
                onValueChange={(next) => setServiceId(next ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {(servicesData?.items ?? []).map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select
                items={durationItems}
                value={durationMinutes}
                onValueChange={(next) => setDurationMinutes(next ?? "60")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={String(preset.value)}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => createMutation.mutate()}
              disabled={!serviceId || createMutation.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
