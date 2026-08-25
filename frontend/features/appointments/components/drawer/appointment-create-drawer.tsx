"use client";

import { useIsMobile } from "@/lib/hooks/use-mobile";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { DrawerAddAction } from "@/components/drawer/drawer-add-action";
import { DrawerItemAddLayout } from "@/components/drawer/drawer-item-add-layout";
import { DrawerPlusIcon } from "@/components/drawer/drawer-icons";
import { DrawerCheckboxRow } from "@/components/drawer/drawer-checkbox-row";
import { DrawerExpressRow } from "@/components/drawer/drawer-express-row";
import { DrawerFooterContent } from "@/components/drawer/drawer-footer-content";
import { DrawerFormFieldGroup } from "@/components/drawer/drawer-form-field-group";
import { DrawerFormFields } from "@/components/drawer/drawer-form-fields";
import { DrawerHeaderContent } from "@/components/drawer/drawer-header-content";
import { DrawerPrimaryButton } from "@/components/drawer/drawer-primary-button";
import { DrawerSettingsIcon } from "@/components/drawer/drawer-icons";
import { ActionButton } from "@/components/ui/action-button";
import {
  DrawerShell,
} from "@/components/layout/drawer-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ContactPicker } from "@/features/contacts/components/contact-picker";
import type { Contact } from "@/features/contacts/types";
import {
  createAppointment,
  createExpressAppointment,
} from "@/features/appointments/api/appointments.api";
import { AppointmentDateTimeFields } from "@/features/appointments/components/drawer/appointment-datetime-fields";
import { AppointmentClientCard } from "@/features/appointments/components/drawer/appointment-client-card";
import { AppointmentTypeTabs } from "@/features/appointments/components/drawer/appointment-type-tabs";
import {
  AppointmentServiceLineEditor,
  AppointmentServicePicker,
  AppointmentServiceCombobox,
  type AppointmentServiceLineSelection,
  type StaffOption,
} from "@/features/appointments/components/appointment-service-line-editor";
import type { AppointmentCreateDefaults } from "@/features/appointments/hooks/use-appointment-drawer";
import {
  buildAppointmentSchedulePayload,
  getChainedStartMinutes,
  rechainAllServiceLines,
  scheduleFromUtcIso,
  serviceToLineSelection,
} from "@/features/appointments/utils/appointment-service-lines";
import { getCalendarSchedulingConfig } from "@/features/appointments/utils/appointment-scheduling";
import { listCalendars } from "@/features/calendars/api/calendars.api";
import { resolveAppointmentDisplayTimezone } from "@/features/calendars/utils/timezone";
import { listBusinessMembers } from "@/features/settings/api/business.api";
import { useAppointmentsWorkingHours } from "@/features/appointments/hooks/use-appointments-working-hours";
import {
  dayOfWeekForDateKey,
  getOutsideScheduleMessage,
  getWorkingWindowForDay,
  isRangeOutsideWorkingWindow,
  resolveEffectiveWeeklyHours,
} from "@/features/appointments/utils/working-hours";
import { useCurrentBusiness } from "@/features/settings/hooks/use-current-business";
import { getOnlineBookingSettings } from "@/features/online-booking-settings/api/online-booking-settings.api";
import {
  APPOINTMENT_EXPRESS_COMPLETE_KEY,
  getNotificationChannelPreference,
} from "@/features/notifications/api/notification-channel-preferences.api";
import { hasPhoneDigits } from "@/lib/forms/phone";
import { queryKeys } from "@/lib/query/keys";
import type { Service } from "@/lib/types/api";
import {
  APPOINTMENT_DRAWER_ADD_ACTION_CLASS,
  APPOINTMENT_DRAWER_ADD_ACTION_ICON_CLASS,
  APPOINTMENT_DRAWER_BODY_INSET_CLASS,
  APPOINTMENT_DRAWER_FIELD_CLASS,
  APPOINTMENT_DRAWER_FOOTER_CLASS,
  APPOINTMENT_DRAWER_SETTINGS_ICON_BUTTON_CLASS,
  APPOINTMENT_DRAWER_SHELL_CLASS,
  APPOINTMENT_DRAWER_MOBILE_SHELL_CLASS,
  APPOINTMENT_DRAWER_SHELL_HEADER_CLASS,
  APPOINTMENT_DRAWER_SWITCH_CLASS,
} from "@/features/appointments/styles/appointment-drawer-tokens";
import { cn } from "@/lib/utils";

const NOTES_MAX_LENGTH = 400;

function contactHasPhone(contact: Contact | null | undefined): boolean {
  if (!contact) return false;
  return (
    hasPhoneDigits(contact.phone) ||
    hasPhoneDigits(contact.phoneNumber)
  );
}

export interface AppointmentCreateDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults: AppointmentCreateDefaults | null;
  defaultCalendarId?: string;
  /** Authoritative timezone from the calendar grid (keeps clicked slot time consistent). */
  timezone?: string;
  onSuccess?: (appointmentId: string) => void;
  onCreateTimeBlock?: () => void;
}

function memberLabel(member: {
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}): string {
  const name = [member.user.firstName, member.user.lastName]
    .filter(Boolean)
    .join(" ");
  return name || member.user.email;
}

export function AppointmentCreateDrawer({
  open,
  onOpenChange,
  defaults,
  defaultCalendarId,
  timezone: timezoneProp,
  onSuccess,
  onCreateTimeBlock,
}: AppointmentCreateDrawerProps) {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { data: business } = useCurrentBusiness();

  const { data: calendars } = useQuery({
    queryKey: queryKeys.calendars.list({ limit: 100 }),
    queryFn: () => listCalendars({ page: 1, limit: 100 }),
  });

  const { data: members } = useQuery({
    queryKey: queryKeys.business.members({ page: 1, limit: 100 }),
    queryFn: () => listBusinessMembers({ page: 1, limit: 100 }),
  });

  const calendarId =
    defaults?.calendarId ?? defaultCalendarId ?? calendars?.items[0]?.id ?? "";

  const selectedCalendar = useMemo(
    () => calendars?.items.find((calendar) => calendar.id === calendarId),
    [calendars?.items, calendarId],
  );

  const resolvedTimezone = useMemo(
    () =>
      resolveAppointmentDisplayTimezone(
        business?.timezone,
        calendarId || undefined,
        calendars?.items,
      ),
    [business?.timezone, calendarId, calendars?.items],
  );
  const timezone = timezoneProp ?? resolvedTimezone;

  const schedulingConfig = getCalendarSchedulingConfig(selectedCalendar);

  const staffOptions: StaffOption[] = useMemo(
    () =>
      (members?.items ?? []).map((member) => ({
        userId: member.userId,
        label: memberLabel(member),
      })),
    [members?.items],
  );

  const defaultAssignedToId =
    defaults?.assignedToId ?? staffOptions[0]?.userId ?? "";

  const [contactId, setContactId] = useState("");
  const [contactLabel, setContactLabel] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [dateKey, setDateKey] = useState("");
  const [startMinutes, setStartMinutes] = useState(9 * 60);
  const [services, setServices] = useState<AppointmentServiceLineSelection[]>([]);
  const [notes, setNotes] = useState("");
  const [sendConfirmation, setSendConfirmation] = useState(true);
  const [useExpressBooking, setUseExpressBooking] = useState(false);
  const [expressTimeLimitMinutes, setExpressTimeLimitMinutes] = useState(30);
  const [expressRequireCard, setExpressRequireCard] = useState(false);
  const [expressRequireDeposit, setExpressRequireDeposit] = useState(false);
  const [expressOverridesOpen, setExpressOverridesOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [draftNotes, setDraftNotes] = useState("");
  const [servicePickerOpen, setServicePickerOpen] = useState(false);

  const { data: onlineBookingSettings } = useQuery({
    queryKey: ["online-booking-settings"],
    queryFn: getOnlineBookingSettings,
    enabled: open,
  });

  const { data: expressChannelPref } = useQuery({
    queryKey: queryKeys.notificationChannelPreferences.detail(
      APPOINTMENT_EXPRESS_COMPLETE_KEY,
    ),
    queryFn: () =>
      getNotificationChannelPreference(APPOINTMENT_EXPRESS_COMPLETE_KEY),
    enabled: open,
  });

  const expressEnabled = onlineBookingSettings?.expressBookingEnabled === true;
  const expressLinkChannel = expressChannelPref?.channel ?? "EMAIL";
  const expressSendViaSms = expressLinkChannel === "SMS";

  const assignedStaffIds = useMemo(
    () =>
      [
        ...new Set(
          services
            .map((line) => line.assignedToId)
            .filter(Boolean)
            .concat(defaultAssignedToId ? [defaultAssignedToId] : []),
        ),
      ] as string[],
    [services, defaultAssignedToId],
  );

  const { businessSlots, staffSlotsByUserId } =
    useAppointmentsWorkingHours(assignedStaffIds);

  const outsideScheduleWarning = useMemo(() => {
    if (!dateKey || !services.length) return null;
    for (const line of services) {
      const staffId = line.assignedToId ?? defaultAssignedToId;
      if (!staffId) continue;
      const staffSlots = staffSlotsByUserId.get(staffId) ?? null;
      const weekly = resolveEffectiveWeeklyHours(
        businessSlots,
        staffSlots ?? undefined,
      );
      const dayOfWeek = dayOfWeekForDateKey(dateKey, timezone);
      const window = getWorkingWindowForDay(weekly, dayOfWeek);
      const lineStart = line.startMinutes ?? startMinutes;
      const lineEnd = lineStart + line.occupancyMinutes;
      if (isRangeOutsideWorkingWindow(lineStart, lineEnd, window)) {
        const staffLabel =
          staffOptions.find((s) => s.userId === staffId)?.label ??
          "this staff member";
        return getOutsideScheduleMessage(staffLabel);
      }
    }
    return null;
  }, [
    dateKey,
    services,
    defaultAssignedToId,
    staffSlotsByUserId,
    businessSlots,
    timezone,
    startMinutes,
    staffOptions,
  ]);

  useEffect(() => {
    if (!open) return;
    setExpressOverridesOpen(false);
    setNotesOpen(false);
    setDraftNotes("");
    setServicePickerOpen(false);
  }, [open]);

  useEffect(() => {
    if (!open || !defaults) return;
    const schedule = scheduleFromUtcIso(
      defaults.startAt,
      defaults.endAt ?? defaults.startAt,
      timezone,
    );
    setContactId(defaults.contactId ?? "");
    setContactLabel(defaults.contactLabel ?? "");
    setSelectedContact(null);
    setDateKey(schedule.dateKey);
    setStartMinutes(schedule.appointmentStartMinutes);
    setServices(
      defaults.services?.length
        ? rechainAllServiceLines(
            defaults.services,
            schedule.appointmentStartMinutes,
          )
        : [],
    );
    setNotes(defaults.notes ?? "");
    setSendConfirmation(true);
  }, [open, defaults, timezone]);

  useEffect(() => {
    if (!open) return;
    setUseExpressBooking(false);
    setExpressTimeLimitMinutes(
      onlineBookingSettings?.expressBookingTimeLimitMinutes ?? 30,
    );
    setExpressRequireCard(onlineBookingSettings?.expressRequireCard === true);
    setExpressRequireDeposit(
      onlineBookingSettings?.expressRequireDeposit === true,
    );
  }, [
    open,
    onlineBookingSettings?.expressBookingTimeLimitMinutes,
    onlineBookingSettings?.expressRequireCard,
    onlineBookingSettings?.expressRequireDeposit,
  ]);

  const currencyCode = business?.taxesAndCurrency?.currencyCode ?? "USD";

  const mutation = useMutation({
    mutationFn: () => {
      if (!calendarId) {
        throw new Error("No calendar available");
      }
      if (!services.length) {
        throw new Error("Select at least one service");
      }
      if (!dateKey) {
        throw new Error("Select a date");
      }

      const schedule = buildAppointmentSchedulePayload({
        dateKey,
        appointmentStartMinutes: startMinutes,
        lines: rechainAllServiceLines(services, startMinutes),
        timezone,
      });
      const assignedToId =
        schedule.services[0]?.assignedToId ?? defaultAssignedToId;
      if (!assignedToId) {
        throw new Error("Select a staff member");
      }

      if (useExpressBooking) {
        if (schedule.services.length !== 1) {
          throw new Error("Express Booking supports one service at a time");
        }

        if (!contactId) {
          throw new Error("Select a client");
        }
        if (expressSendViaSms) {
          if (!contactHasPhone(selectedContact)) {
            throw new Error(
              "Client needs a phone number on file to send the Express Booking link by SMS",
            );
          }
        } else if (!selectedContact?.email?.trim()) {
          throw new Error(
            "Client needs an email on file to send the Express Booking link",
          );
        }
        return createExpressAppointment({
          contactId,
          serviceId: schedule.services[0]!.serviceId,
          startAt: schedule.startAt,
          endAt: schedule.endAt,
          assignedToId,
          calendarId,
          expressRequireCard,
          expressRequireDeposit,
          expressTimeLimitMinutes,
        });
      }

      if (!contactId) {
        throw new Error("Select a client");
      }

      return createAppointment({
        calendarId,
        contactId,
        assignedToId,
        title: contactLabel.trim() || "Appointment",
        startAt: schedule.startAt,
        endAt: schedule.endAt,
        notes: notes.trim() || undefined,
        sendConfirmation,
        services: schedule.services,
      });
    },
    onSuccess: (saved) => {
      if (saved.scheduleWarning) {
        toast.warning(saved.scheduleWarning);
      }
      if (saved.status === "PENDING_COMPLETION") {
        toast.success(
          expressSendViaSms
            ? "Completion link sent by SMS — waiting for the client"
            : "Completion link sent by email — waiting for the client",
        );
      } else if (saved.status === "UNCONFIRMED" && saved.scheduleWarning) {
        toast.message(
          "Saved as unconfirmed. Confirm the appointment when ready.",
        );
      } else {
        toast.success("Appointment created");
      }
      void queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.all(),
      });
      onOpenChange(false);
      onSuccess?.(saved.id);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Could not create appointment",
      );
    },
  });

  const handleContactSelect = (contact: Contact) => {
    setContactLabel(contact.label);
    setSelectedContact(contact);
  };

  const clientCardContact = selectedContact
    ? {
        id: selectedContact.id,
        firstName: selectedContact.firstName,
        lastName: selectedContact.lastName,
        displayName: selectedContact.displayName,
        email: selectedContact.email,
        phoneNumber: selectedContact.phoneNumber ?? selectedContact.phone,
        createdAt: selectedContact.createdAt,
      }
    : null;

  const hasFilledServices = services.length > 0;

  const openNotesEditor = () => {
    setDraftNotes(notes);
    setNotesOpen(true);
  };

  const confirmNotes = () => {
    setNotes(draftNotes.trim());
    setNotesOpen(false);
    setDraftNotes("");
  };

  const cancelNotes = () => {
    setNotesOpen(false);
    setDraftNotes("");
  };

  const handleAddService = (service: Service) => {
    const nextStartMinutes = getChainedStartMinutes(
      services,
      services.length,
      startMinutes,
    );
    const assignedToId =
      services[services.length - 1]?.assignedToId || defaultAssignedToId;
    setServices((current) => [
      ...current,
      serviceToLineSelection(service, {
        assignedToId,
        startMinutes: nextStartMinutes,
      }),
    ]);
  };

  const headerDateLabel = useMemo(() => {
    if (!dateKey) return "";
    const date = new Date(`${dateKey}T12:00:00`);
    if (Number.isNaN(date.getTime())) return "";
    return date
      .toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
      .toUpperCase();
  }, [dateKey]);

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      variant="sheet"
      width="appointment"
      chrome={isMobile ? "mobile-brand" : "default"}
      spineLabel={isMobile ? undefined : "NEW APPOINTMENT"}
      className={
        isMobile
          ? APPOINTMENT_DRAWER_MOBILE_SHELL_CLASS
          : APPOINTMENT_DRAWER_SHELL_CLASS
      }
      title={
        isMobile ? (
          "New Appointment"
        ) : (
          <DrawerHeaderContent
            eyebrow={headerDateLabel || undefined}
            title="New Appointment"
          />
        )
      }
      headerClassName={
        isMobile ? undefined : APPOINTMENT_DRAWER_SHELL_HEADER_CLASS
      }
      contentClassName="!px-0 !py-0"
      footerClassName={APPOINTMENT_DRAWER_FOOTER_CLASS}
      footer={
        <DrawerFooterContent>
          {expressEnabled ? (
            <DrawerExpressRow
              id="use-express-booking"
              checked={useExpressBooking}
              onCheckedChange={setUseExpressBooking}
              settings={
                <Popover
                  open={expressOverridesOpen}
                  onOpenChange={setExpressOverridesOpen}
                >
                  <PopoverTrigger
                    render={
                      <button
                        type="button"
                        aria-label="Express Booking overrides"
                        className={APPOINTMENT_DRAWER_SETTINGS_ICON_BUTTON_CLASS}
                      >
                        <DrawerSettingsIcon className="size-6" />
                      </button>
                    }
                  />
                  <PopoverContent align="end" className="w-72 gap-3 p-3">
                    <div className="flex flex-col gap-1.5">
                      <Label
                        htmlFor="express-time-limit"
                        className="text-caption font-medium text-foreground"
                      >
                        Time limit (minutes)
                      </Label>
                      <Input
                        id="express-time-limit"
                        type="number"
                        min={1}
                        value={expressTimeLimitMinutes}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          setExpressTimeLimitMinutes(
                            Number.isFinite(next) && next > 0 ? next : 1,
                          );
                        }}
                        className={APPOINTMENT_DRAWER_FIELD_CLASS}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <Label
                        htmlFor="express-require-card"
                        className="text-caption font-medium text-foreground"
                      >
                        Require credit card
                      </Label>
                      <Switch
                        id="express-require-card"
                        checked={expressRequireCard}
                        onCheckedChange={setExpressRequireCard}
                        className={APPOINTMENT_DRAWER_SWITCH_CLASS}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <Label
                        htmlFor="express-require-deposit"
                        className="text-caption font-medium text-foreground"
                      >
                        Require deposit/payment
                      </Label>
                      <Switch
                        id="express-require-deposit"
                        checked={expressRequireDeposit}
                        onCheckedChange={setExpressRequireDeposit}
                        className={APPOINTMENT_DRAWER_SWITCH_CLASS}
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              }
            />
          ) : null}
          <DrawerPrimaryButton
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending
              ? useExpressBooking
                ? "Sending…"
                : "Booking…"
              : useExpressBooking
                ? "Send completion link"
                : "Book Appointment"}
          </DrawerPrimaryButton>
        </DrawerFooterContent>
      }
    >
      <div className={APPOINTMENT_DRAWER_BODY_INSET_CLASS}>
        {onCreateTimeBlock ? (
          <AppointmentTypeTabs onTimeBlockClick={onCreateTimeBlock} />
        ) : null}

        <DrawerFormFields>
          <AppointmentDateTimeFields
            dateKey={dateKey}
            startMinutes={startMinutes}
            slotIntervalMinutes={schedulingConfig.slotIntervalMinutes}
            onDateChange={setDateKey}
            onStartMinutesChange={(minutes) => {
              setStartMinutes(minutes);
              setServices((current) =>
                rechainAllServiceLines(current, minutes),
              );
            }}
          />

          {clientCardContact ? (
            <AppointmentClientCard
              contact={clientCardContact}
              onRemove={() => {
                setContactId("");
                setContactLabel("");
                setSelectedContact(null);
              }}
            />
          ) : (
            <DrawerFormFieldGroup label="Client">
              <ContactPicker
                value={contactId}
                onValueChange={(id) => {
                  setContactId(id);
                  if (!id) setSelectedContact(null);
                }}
                onContactSelect={handleContactSelect}
                placeholder="Search or create a client"
                variant="drawer"
              />
            </DrawerFormFieldGroup>
          )}

          {hasFilledServices ? (
            <AppointmentServiceLineEditor
              value={services}
              onChange={(next) =>
                setServices(useExpressBooking ? next.slice(0, 1) : next)
              }
              staffOptions={staffOptions}
              defaultAssignedToId={defaultAssignedToId}
              appointmentStartMinutes={startMinutes}
              onAppointmentStartMinutesChange={(minutes) => {
                setStartMinutes(minutes);
                setServices((current) =>
                  rechainAllServiceLines(current, minutes),
                );
              }}
              slotIntervalMinutes={schedulingConfig.slotIntervalMinutes}
              currencyCode={currencyCode}
              variant="drawer"
              filledDisplay
              pickerOpen={servicePickerOpen}
              onPickerOpenChange={setServicePickerOpen}
            />
          ) : (
            <DrawerFormFieldGroup label="Service">
              <AppointmentServiceLineEditor
                value={services}
                onChange={(next) =>
                  setServices(useExpressBooking ? next.slice(0, 1) : next)
                }
                staffOptions={staffOptions}
                defaultAssignedToId={defaultAssignedToId}
                appointmentStartMinutes={startMinutes}
                onAppointmentStartMinutesChange={(minutes) => {
                  setStartMinutes(minutes);
                  setServices((current) =>
                    rechainAllServiceLines(current, minutes),
                  );
                }}
                slotIntervalMinutes={schedulingConfig.slotIntervalMinutes}
                currencyCode={currencyCode}
                variant="drawer"
                filledDisplay
              />
            </DrawerFormFieldGroup>
          )}

          <DrawerItemAddLayout
            items={
              !notesOpen && notes.trim() ? (
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Add a description to the client"
                  rows={3}
                  maxLength={NOTES_MAX_LENGTH}
                  className={cn(
                    APPOINTMENT_DRAWER_FIELD_CLASS,
                    "min-h-[88px] resize-none py-3",
                  )}
                />
              ) : null
            }
            editor={
              <>
                {servicePickerOpen && hasFilledServices ? (
                  <AppointmentServiceCombobox
                    excludedIds={services.map((line) => line.serviceId)}
                    onAdd={(service) => {
                      handleAddService(service);
                      setServicePickerOpen(false);
                    }}
                    currencyCode={currencyCode}
                    placeholder="Search services…"
                    triggerClassName={cn(
                      APPOINTMENT_DRAWER_FIELD_CLASS,
                      "font-normal",
                    )}
                    defaultOpen
                  />
                ) : null}
                {notesOpen ? (
                <div className="flex flex-col gap-2">
                  <Textarea
                    value={draftNotes}
                    onChange={(event) => setDraftNotes(event.target.value)}
                    placeholder="Add a description to the client"
                    rows={3}
                    maxLength={NOTES_MAX_LENGTH}
                    className={cn(
                      APPOINTMENT_DRAWER_FIELD_CLASS,
                      "min-h-[88px] resize-none py-3",
                    )}
                  />
                  <div className="flex items-center justify-end gap-2">
                    <ActionButton
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 min-w-[72px] px-4"
                      onClick={cancelNotes}
                    >
                      Cancel
                    </ActionButton>
                    <ActionButton
                      type="button"
                      size="sm"
                      className="h-9 min-w-[72px] border-0 bg-violet-primary-normal px-4 text-white hover:bg-violet-primary-normal-hover"
                      onClick={confirmNotes}
                    >
                      Add
                    </ActionButton>
                  </div>
                </div>
                ) : null}
              </>
            }
            actions={
              hasFilledServices ? (
                <div className="flex flex-wrap items-center gap-6">
                  {!useExpressBooking ? (
                    <AppointmentServicePicker
                      open={servicePickerOpen}
                      onOpenChange={setServicePickerOpen}
                      value={services}
                      currencyCode={currencyCode}
                      onAdd={handleAddService}
                      trigger={
                        <button
                          type="button"
                          className={APPOINTMENT_DRAWER_ADD_ACTION_CLASS}
                        >
                          <span
                            className={APPOINTMENT_DRAWER_ADD_ACTION_ICON_CLASS}
                          >
                            <DrawerPlusIcon className="size-4 text-white" />
                          </span>
                          Add Service
                        </button>
                      }
                    />
                  ) : null}
                  {!notesOpen ? (
                    <DrawerAddAction
                      label="Add Note"
                      onClick={openNotesEditor}
                    />
                  ) : null}
                </div>
              ) : !notesOpen ? (
                <DrawerAddAction label="Add Note" onClick={openNotesEditor} />
              ) : null
            }
          />

          <DrawerCheckboxRow
            id="send-confirmation"
            label="Send confirmation to the client"
            checked={sendConfirmation}
            onCheckedChange={setSendConfirmation}
          />
        </DrawerFormFields>

        {useExpressBooking &&
        contactId &&
        expressSendViaSms &&
        !contactHasPhone(selectedContact) ? (
          <p className="text-[12px] text-amber-700">
            This client needs a phone number to receive the completion link by
            SMS.
          </p>
        ) : null}
        {useExpressBooking &&
        contactId &&
        !expressSendViaSms &&
        !selectedContact?.email?.trim() ? (
          <p className="text-[12px] text-amber-700">
            This client needs an email address to receive the completion link.
          </p>
        ) : null}

        {outsideScheduleWarning ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-950">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>{outsideScheduleWarning}</p>
          </div>
        ) : null}
      </div>
    </DrawerShell>
  );
}
