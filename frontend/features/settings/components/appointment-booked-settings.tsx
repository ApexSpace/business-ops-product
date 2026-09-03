"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LoadingState } from "@/components/data-display/loading-state";
import { SettingsFormPage } from "@/components/layout/settings-page-layout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import { AutomatedMessageCard } from "@/features/appointment-automated-messages/components/automated-message-card";
import {
  AddMessageButton,
  AutomatedMessageTimelineNode,
  AutomatedMessageTriggerBanner,
} from "@/features/appointment-automated-messages/components/automated-message-timeline";
import { useAppointmentAutomatedMessageMutations } from "@/features/appointment-automated-messages/hooks/use-appointment-automated-message-mutations";
import {
  useAppointmentAutomatedMessageCatalog,
  useAppointmentAutomatedMessages,
} from "@/features/appointment-automated-messages/hooks/use-appointment-automated-messages";
import type {
  AppointmentAutomatedMessageOffsetUnit,
  AppointmentAutomatedMessageSourceScope,
  AppointmentAutomatedMessageTrigger,
  NotificationChannel,
} from "@/features/appointment-automated-messages/api/appointment-automated-messages.api";
import {
  formatBeforeStartLabel,
  formatTriggerBannerLabel,
} from "@/features/appointment-automated-messages/utils/trigger-labels";
import { SETTINGS_FORM_SECTION_STACK_CLASS } from "@/lib/design/settings-form-tokens";

const SOURCE_SECTIONS: Array<{
  scope: AppointmentAutomatedMessageSourceScope;
  title: string;
}> = [
  { scope: "ALL", title: "Send for all bookings" },
  { scope: "ONLINE", title: "Send for online bookings only" },
  { scope: "STAFF", title: "Send for staff-made bookings only" },
];

export function AppointmentBookedSettings() {
  const canEdit = useCan(PERMISSIONS["settings.business"]);
  const { data, isLoading, isError, error } =
    useAppointmentAutomatedMessages("BOOKED");
  const { data: catalog = [] } = useAppointmentAutomatedMessageCatalog("BOOKED");
  const mutations = useAppointmentAutomatedMessageMutations("BOOKED");

  const [addMessageOpen, setAddMessageOpen] = useState(false);
  const [addMessageTriggerId, setAddMessageTriggerId] = useState<string | null>(
    null,
  );
  const [addMessageScope, setAddMessageScope] =
    useState<AppointmentAutomatedMessageSourceScope>("ALL");
  const [selectedCatalogKey, setSelectedCatalogKey] = useState("");
  const [selectedChannel, setSelectedChannel] =
    useState<NotificationChannel>("EMAIL");

  const [editTrigger, setEditTrigger] =
    useState<AppointmentAutomatedMessageTrigger | null>(null);
  const [editOffsetValue, setEditOffsetValue] = useState("1");
  const [editOffsetUnit, setEditOffsetUnit] =
    useState<AppointmentAutomatedMessageOffsetUnit>("DAYS");

  const [addReminderOpen, setAddReminderOpen] = useState(false);
  const [newOffsetValue, setNewOffsetValue] = useState("2");
  const [newOffsetUnit, setNewOffsetUnit] =
    useState<AppointmentAutomatedMessageOffsetUnit>("DAYS");

  const immediateTrigger = useMemo(
    () => data?.triggers.find((t) => t.kind === "IMMEDIATE") ?? null,
    [data?.triggers],
  );

  const beforeStartTriggers = useMemo(
    () =>
      (data?.triggers ?? [])
        .filter((t) => t.kind === "BEFORE_START")
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [data?.triggers],
  );

  const openAddMessage = (
    triggerId: string,
    scope: AppointmentAutomatedMessageSourceScope,
  ) => {
    setAddMessageTriggerId(triggerId);
    setAddMessageScope(scope);
    setSelectedCatalogKey(catalog[0]?.notificationKey ?? "");
    setSelectedChannel(catalog[0]?.channels[0] ?? "EMAIL");
    setAddMessageOpen(true);
  };

  if (isLoading) {
    return <LoadingState label="Loading Appointment Booked settings…" />;
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error
          ? error.message
          : "Could not load Appointment Booked settings"}
      </p>
    );
  }

  return (
    <SettingsFormPage
      title="Appointment Booked"
      description="Configure which automated messages are sent after an appointment is booked."
    >
      <div className={SETTINGS_FORM_SECTION_STACK_CLASS}>
        <AutomatedMessageTimelineNode>
          <AutomatedMessageTriggerBanner
            label={
              immediateTrigger
                ? formatTriggerBannerLabel(immediateTrigger)
                : "Immediately when booked."
            }
            showEdit={false}
          />

          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">
              Set appointment status to:
            </p>
            <RadioGroup
              value={data.defaultStatus ?? "CONFIRMED"}
              onValueChange={(value) => {
                if (!canEdit) return;
                mutations.updateSettingsMutation.mutate({
                  defaultStatus: value as "UNCONFIRMED" | "CONFIRMED",
                });
              }}
              disabled={!canEdit || mutations.updateSettingsMutation.isPending}
              className="space-y-3"
            >
              <label className="flex items-start gap-3">
                <RadioGroupItem value="UNCONFIRMED" className="mt-0.5" />
                <span className="space-y-1">
                  <span className="block text-sm font-medium">Unconfirmed</span>
                  <span className="block text-xs text-muted-foreground">
                    Messages to request confirmation can be sent to clients if
                    booking occurs before confirmation requests are scheduled.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3">
                <RadioGroupItem value="CONFIRMED" className="mt-0.5" />
                <span className="space-y-1">
                  <span className="block text-sm font-medium">Confirmed</span>
                  <span className="block text-xs text-muted-foreground">
                    Clients cannot be asked to confirm appointments.
                  </span>
                </span>
              </label>
            </RadioGroup>
          </div>

          {SOURCE_SECTIONS.map((section) => {
            const messages =
              immediateTrigger?.messages.filter(
                (m) => m.sourceScope === section.scope,
              ) ?? [];
            return (
              <div key={section.scope} className="space-y-2">
                <p className="text-sm font-semibold text-foreground">
                  {section.title}
                </p>
                <div className="space-y-2">
                  {messages.map((message) => (
                    <AutomatedMessageCard
                      key={message.id}
                      message={message}
                      disabled={!canEdit}
                      onToggleEnabled={(enabled) =>
                        mutations.updateMessageMutation.mutate({
                          messageId: message.id,
                          body: { enabled },
                        })
                      }
                      onDelete={() =>
                        mutations.deleteMessageMutation.mutate(message.id)
                      }
                    />
                  ))}
                </div>
                {immediateTrigger ? (
                  <AddMessageButton
                    disabled={!canEdit}
                    onClick={() =>
                      openAddMessage(immediateTrigger.id, section.scope)
                    }
                  />
                ) : null}
              </div>
            );
          })}
        </AutomatedMessageTimelineNode>

        {beforeStartTriggers.map((trigger, index) => (
          <AutomatedMessageTimelineNode
            key={trigger.id}
            isLast={index === beforeStartTriggers.length - 1}
          >
            <AutomatedMessageTriggerBanner
              label={formatTriggerBannerLabel(trigger)}
              showEdit={canEdit}
              onEdit={() => {
                setEditTrigger(trigger);
                setEditOffsetValue(String(trigger.offsetValue ?? 1));
                setEditOffsetUnit(trigger.offsetUnit ?? "DAYS");
              }}
            />
            <p className="text-sm font-semibold text-foreground">Send:</p>
            <div className="space-y-2">
              {trigger.messages.map((message) => (
                <AutomatedMessageCard
                  key={message.id}
                  message={message}
                  disabled={!canEdit}
                  onToggleEnabled={(enabled) =>
                    mutations.updateMessageMutation.mutate({
                      messageId: message.id,
                      body: { enabled },
                    })
                  }
                  onDelete={() =>
                    mutations.deleteMessageMutation.mutate(message.id)
                  }
                />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <AddMessageButton
                disabled={!canEdit}
                onClick={() => openAddMessage(trigger.id, "ALL")}
              />
              {canEdit ? (
                <button
                  type="button"
                  className="text-sm font-medium text-destructive hover:underline"
                  onClick={() =>
                    mutations.deleteTriggerMutation.mutate(trigger.id)
                  }
                >
                  Remove timing
                </button>
              ) : null}
            </div>
          </AutomatedMessageTimelineNode>
        ))}

        {canEdit ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setAddReminderOpen(true)}
          >
            Add reminder timing
          </Button>
        ) : null}

        <p className="text-xs italic text-muted-foreground">
          Please note: Emails or text messages to request confirmation of the
          appointment cannot be sent on the same day.
        </p>

        <p className="text-sm text-muted-foreground">
          To manage messages related to check-in go to{" "}
          <Link
            href="/business/settings/waiting-room"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Waiting Room
          </Link>{" "}
          or{" "}
          <Link
            href="/business/settings/notifications?tab=templates&type=appointment.ready"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Ready for service template
          </Link>
          .
        </p>
      </div>

      <Dialog open={addMessageOpen} onOpenChange={setAddMessageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Message type</Label>
              <Select
                value={selectedCatalogKey}
                onValueChange={(value) => {
                  if (value == null) return;
                  setSelectedCatalogKey(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select message" />
                </SelectTrigger>
                <SelectContent>
                  {catalog.map((item) => (
                    <SelectItem
                      key={item.notificationKey}
                      value={item.notificationKey}
                    >
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select
                value={selectedChannel}
                onValueChange={(v) =>
                  setSelectedChannel(v as NotificationChannel)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="SMS">Text message</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="brand"
              disabled={
                !addMessageTriggerId ||
                !selectedCatalogKey ||
                mutations.createMessageMutation.isPending
              }
              onClick={() => {
                if (!addMessageTriggerId || !selectedCatalogKey) return;
                mutations.createMessageMutation.mutate(
                  {
                    triggerId: addMessageTriggerId,
                    body: {
                      sourceScope: addMessageScope,
                      channel: selectedChannel,
                      notificationKey: selectedCatalogKey,
                    },
                  },
                  { onSuccess: () => setAddMessageOpen(false) },
                );
              }}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editTrigger)}
        onOpenChange={(open) => {
          if (!open) setEditTrigger(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit reminder timing</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Value</Label>
              <Input
                type="number"
                min={1}
                value={editOffsetValue}
                onChange={(e) => setEditOffsetValue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select
                value={editOffsetUnit}
                onValueChange={(v) =>
                  setEditOffsetUnit(v as AppointmentAutomatedMessageOffsetUnit)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAYS">Days</SelectItem>
                  <SelectItem value="HOURS">Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Preview:{" "}
            {formatBeforeStartLabel(
              parseInt(editOffsetValue, 10) || 1,
              editOffsetUnit,
            )}
          </p>
          <DialogFooter>
            <Button
              variant="brand"
              disabled={mutations.updateTriggerMutation.isPending}
              onClick={() => {
                if (!editTrigger) return;
                mutations.updateTriggerMutation.mutate(
                  {
                    triggerId: editTrigger.id,
                    body: {
                      offsetValue: parseInt(editOffsetValue, 10) || 1,
                      offsetUnit: editOffsetUnit,
                    },
                  },
                  { onSuccess: () => setEditTrigger(null) },
                );
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addReminderOpen} onOpenChange={setAddReminderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add reminder timing</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Value</Label>
              <Input
                type="number"
                min={1}
                value={newOffsetValue}
                onChange={(e) => setNewOffsetValue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select
                value={newOffsetUnit}
                onValueChange={(v) =>
                  setNewOffsetUnit(v as AppointmentAutomatedMessageOffsetUnit)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAYS">Days</SelectItem>
                  <SelectItem value="HOURS">Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="brand"
              disabled={mutations.createTriggerMutation.isPending}
              onClick={() => {
                mutations.createTriggerMutation.mutate(
                  {
                    kind: "BEFORE_START",
                    offsetValue: parseInt(newOffsetValue, 10) || 1,
                    offsetUnit: newOffsetUnit,
                  },
                  { onSuccess: () => setAddReminderOpen(false) },
                );
              }}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsFormPage>
  );
}
