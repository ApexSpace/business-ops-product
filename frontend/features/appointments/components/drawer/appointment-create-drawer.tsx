"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Settings, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import {
  DrawerShell,
  DRAWER_FOOTER_BUTTON_CLASS,
} from "@/components/layout/drawer-shell";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/forms/phone-input";
import { ContactPicker } from "@/features/contacts/components/contact-picker";
import type { Contact } from "@/features/contacts/types";
import {
  createAppointment,
  createExpressAppointment,
} from "@/features/appointments/api/appointments.api";
import { AppointmentBookingDateTimeFields } from "@/features/appointments/components/appointment-booking-datetime-fields";
import {
  AppointmentServiceLineEditor,
  type AppointmentServiceLineSelection,
  type StaffOption,
} from "@/features/appointments/components/appointment-service-line-editor";
import type { AppointmentCreateDefaults } from "@/features/appointments/hooks/use-appointment-drawer";
import {
  buildAppointmentSchedulePayload,
  rechainAllServiceLines,
  scheduleFromUtcIso,
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
import { hasPhoneDigits, phoneToApiFields } from "@/lib/forms/phone";
import { queryKeys } from "@/lib/query/keys";
import {
  APPOINTMENT_POPUP_DESCRIPTION_CLASS,
  APPOINTMENT_POPUP_FIELD_CLASS,
  APPOINTMENT_POPUP_FOOTER_CLASS,
  APPOINTMENT_POPUP_HEADER_CLASS,
  APPOINTMENT_POPUP_PRIMARY_BUTTON_CLASS,
  APPOINTMENT_POPUP_SHELL_CLASS,
} from "@/features/appointments/styles/appointment-side-popup";
import { DRAWER_FORM_ITEM_CLASS } from "@/lib/design/drawer-shell-tokens";
import { cn } from "@/lib/utils";

const NOTES_MAX_LENGTH = 400;

type ExpressClientMode = "existing" | "new";

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
  const [expressClientMode, setExpressClientMode] =
    useState<ExpressClientMode>("existing");
  const [guestFirstName, setGuestFirstName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
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
    setExpressClientMode("existing");
    setGuestFirstName("");
    setGuestEmail("");
    setGuestPhone("");
    setExpressOverridesOpen(false);
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
    setUseExpressBooking(
      onlineBookingSettings?.expressBookingAutoEnable === true,
    );
    setExpressTimeLimitMinutes(
      onlineBookingSettings?.expressBookingTimeLimitMinutes ?? 30,
    );
    setExpressRequireCard(onlineBookingSettings?.expressRequireCard === true);
    setExpressRequireDeposit(
      onlineBookingSettings?.expressRequireDeposit === true,
    );
  }, [
    open,
    onlineBookingSettings?.expressBookingAutoEnable,
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

        const expressOverrides = {
          expressRequireCard,
          expressRequireDeposit,
          expressTimeLimitMinutes,
        };

        if (expressClientMode === "new") {
          const firstName = guestFirstName.trim();
          if (!firstName) {
            throw new Error("Enter the client's first name");
          }

          if (expressSendViaSms) {
            const phoneFields = phoneToApiFields(guestPhone);
            if (!phoneFields.phoneNumber) {
              throw new Error("Enter the client's phone number");
            }
            return createExpressAppointment({
              guestFirstName: firstName,
              guestPhone: phoneFields.phoneNumber,
              guestPhoneCountryCode:
                phoneFields.phoneCountryCode ?? undefined,
              serviceId: schedule.services[0]!.serviceId,
              startAt: schedule.startAt,
              endAt: schedule.endAt,
              assignedToId,
              calendarId,
              ...expressOverrides,
            });
          }

          const email = guestEmail.trim();
          if (!email) {
            throw new Error("Enter the client's email");
          }
          return createExpressAppointment({
            guestFirstName: firstName,
            guestEmail: email,
            serviceId: schedule.services[0]!.serviceId,
            startAt: schedule.startAt,
            endAt: schedule.endAt,
            assignedToId,
            calendarId,
            ...expressOverrides,
          });
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
          ...expressOverrides,
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

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      variant="sheet"
      width="appointment"
      className={APPOINTMENT_POPUP_SHELL_CLASS}
      title="New Appointment"
      headerClassName={cn(
        APPOINTMENT_POPUP_HEADER_CLASS,
        "[&_[data-slot=sheet-title]]:text-[20px] [&_[data-slot=sheet-title]]:font-bold [&_[data-slot=sheet-title]]:text-[#7E3BED]",
        "[&_button[aria-label=Close]]:size-8 [&_button[aria-label=Close]]:rounded-lg [&_button[aria-label=Close]]:border-0 [&_button[aria-label=Close]]:bg-[#F0F0F0] [&_button[aria-label=Close]]:text-[#6B6B6B] [&_button[aria-label=Close]]:shadow-none [&_button[aria-label=Close]]:hover:bg-[#E9E9E9]",
      )}
      contentClassName="!px-0 !py-0"
      footerClassName={APPOINTMENT_POPUP_FOOTER_CLASS}
      description={
        onCreateTimeBlock ? (
          <button
            type="button"
            onClick={onCreateTimeBlock}
            className={cn(APPOINTMENT_POPUP_DESCRIPTION_CLASS, "hover:underline")}
          >
            Or create time block
          </button>
        ) : undefined
      }
      footer={
        <div className="flex w-full flex-col gap-3">
          {expressEnabled ? (
            <div className="flex items-center justify-between gap-3 px-0.5">
              <Label
                htmlFor="use-express-booking"
                className="text-body-small font-medium text-black-secondary-normal"
              >
                Use Express Booking
              </Label>
              <div className="flex items-center gap-1">
                <Popover
                  open={expressOverridesOpen}
                  onOpenChange={setExpressOverridesOpen}
                >
                  <PopoverTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Express Booking overrides"
                      >
                        <Settings className="size-4 text-grey-tertiary-normal" />
                      </Button>
                    }
                  />
                  <PopoverContent align="end" className="w-72 gap-3 p-3">
                    <div className={cn(DRAWER_FORM_ITEM_CLASS, "gap-1.5")}>
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
                        className={APPOINTMENT_POPUP_FIELD_CLASS}
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
                      />
                    </div>
                  </PopoverContent>
                </Popover>
                <Switch
                  id="use-express-booking"
                  checked={useExpressBooking}
                  onCheckedChange={setUseExpressBooking}
                />
              </div>
            </div>
          ) : null}
          <ActionButton
            type="button"
            className={cn(
              DRAWER_FOOTER_BUTTON_CLASS,
              APPOINTMENT_POPUP_PRIMARY_BUTTON_CLASS,
            )}
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
          </ActionButton>
        </div>
      }
    >
      <AppointmentBookingDateTimeFields
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

      <div className="flex flex-col gap-[9px] px-5 py-3">
        {useExpressBooking ? (
          <div className={cn(DRAWER_FORM_ITEM_CLASS, "gap-3")}>
            <Tabs
              value={expressClientMode}
              onValueChange={(value) =>
                setExpressClientMode(value as ExpressClientMode)
              }
            >
              <TabsList className="grid h-9 w-full grid-cols-2">
                <TabsTrigger value="existing" className="text-caption">
                  Existing client
                </TabsTrigger>
                <TabsTrigger value="new" className="text-caption">
                  New client
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {expressClientMode === "existing" ? (
              <>
                <ContactPicker
                  value={contactId}
                  onValueChange={(id) => {
                    setContactId(id);
                    if (!id) setSelectedContact(null);
                  }}
                  onContactSelect={handleContactSelect}
                  placeholder="Search or create a client"
                  triggerClassName={APPOINTMENT_POPUP_FIELD_CLASS}
                />
                {contactId && expressSendViaSms && !contactHasPhone(selectedContact) ? (
                  <p className="text-caption text-amber-700 dark:text-amber-300">
                    This client needs a phone number to receive the completion
                    link by SMS.
                  </p>
                ) : null}
                {contactId &&
                !expressSendViaSms &&
                !selectedContact?.email?.trim() ? (
                  <p className="text-caption text-amber-700 dark:text-amber-300">
                    This client needs an email address to receive the completion
                    link.
                  </p>
                ) : null}
              </>
            ) : (
              <div className="flex flex-col gap-2.5">
                <Input
                  value={guestFirstName}
                  onChange={(event) => setGuestFirstName(event.target.value)}
                  placeholder="First name"
                  maxLength={100}
                  className={APPOINTMENT_POPUP_FIELD_CLASS}
                />
                {expressSendViaSms ? (
                  <PhoneInput
                    value={guestPhone || null}
                    onChange={(value) => setGuestPhone(value ?? "")}
                    placeholder="Phone number"
                    showClear={false}
                    className={APPOINTMENT_POPUP_FIELD_CLASS}
                  />
                ) : (
                  <Input
                    type="email"
                    value={guestEmail}
                    onChange={(event) => setGuestEmail(event.target.value)}
                    placeholder="Email"
                    maxLength={255}
                    className={APPOINTMENT_POPUP_FIELD_CLASS}
                  />
                )}
              </div>
            )}
          </div>
        ) : (
          <div className={cn(DRAWER_FORM_ITEM_CLASS)}>
            <ContactPicker
              value={contactId}
              onValueChange={(id) => {
                setContactId(id);
                if (!id) setSelectedContact(null);
              }}
              onContactSelect={handleContactSelect}
              placeholder="Search or create a client"
              triggerClassName={APPOINTMENT_POPUP_FIELD_CLASS}
            />
          </div>
        )}

        <div className={cn(DRAWER_FORM_ITEM_CLASS)}>
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
          />
          {useExpressBooking ? (
            <p className="text-caption text-grey-tertiary-normal">
              Express Booking uses one service. The client can switch staff when
              they open the email link.
            </p>
          ) : null}
        </div>

        {!useExpressBooking ? (
          <div className={cn(DRAWER_FORM_ITEM_CLASS)}>
            <div className="relative">
              <FileText className="pointer-events-none absolute top-3.5 left-3 size-4 text-grey-tertiary-normal" />
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add notes"
                rows={4}
                maxLength={NOTES_MAX_LENGTH}
                className={cn(
                  APPOINTMENT_POPUP_FIELD_CLASS,
                  "min-h-[110px] resize-none py-3 pl-10",
                )}
              />
              <span className="pointer-events-none absolute right-3 bottom-3 text-caption text-grey-tertiary-normal">
                {notes.length} / {NOTES_MAX_LENGTH}
              </span>
            </div>
          </div>
        ) : null}

        {!useExpressBooking ? (
          <div className="flex items-center gap-2.5">
            <Checkbox
              id="send-confirmation"
              checked={sendConfirmation}
              onCheckedChange={(checked) =>
                setSendConfirmation(checked === true)
              }
            />
            <Label
              htmlFor="send-confirmation"
              className="text-body-small font-medium text-black-secondary-normal"
            >
              Send confirmation to client
            </Label>
          </div>
        ) : null}

        {outsideScheduleWarning ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-body-small text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>{outsideScheduleWarning}</p>
          </div>
        ) : null}
      </div>
    </DrawerShell>
  );
}
