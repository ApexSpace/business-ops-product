"use client";

import { User } from "lucide-react";
import { ContactPicker } from "@/features/contacts/components/contact-picker";
import { AppointmentMeetingLocationFields } from "@/features/appointments/components/appointment-meeting-location-fields";
import { AppointmentPackageField } from "@/features/appointments/components/appointment-package-field";
import { AppointmentScheduleFields } from "@/features/appointments/components/appointment-schedule-fields";
import {
  FORM_DRAWER_FIELD_CONTROL_CLASS,
  FORM_DRAWER_FIELD_LABEL_CLASS,
  FORM_DRAWER_FORM_DIVIDER_CLASS,
  FORM_DRAWER_FORM_ITEM_CLASS,
} from "@/components/forms/form-drawer-shell";
import {
  AppointmentColorDot,
  AppointmentFormAddButton,
  APPOINTMENT_STATUS_DOT_CLASS,
  OptionalFieldLabel,
} from "@/features/appointments/components/appointment-form-ui";
import { SearchableSelect } from "@/components/forms/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  APPOINTMENT_LIFECYCLE_STATUS_OPTIONS,
  type AppointmentStatus,
} from "@/features/appointments/schemas/appointment-profile";
import type { UseAppointmentFormReturn } from "@/features/appointments/hooks/use-appointment-form";
import type { AppointmentLocationMode } from "@/features/calendars/schemas/calendar-profile";
import { cn } from "@/lib/utils";

type FormApi = UseAppointmentFormReturn["form"];

interface AppointmentFormFieldsProps {
  form: FormApi;
  state: UseAppointmentFormReturn;
  isDeletePending?: boolean;
}

export function AppointmentFormFields({
  form,
  state,
}: AppointmentFormFieldsProps) {
  const {
    isEdit,
    canAssign,
    mutation,
    showDescription,
    setShowDescription,
    showNotes,
    setShowNotes,
    locationMode,
    setLocationMode,
    selectedCalendar,
    displayTimezone,
    calendarOptions,
    memberOptions,
    handleContactSelect,
    defaultContactId,
    defaultContactLabel,
    lockContact,
  } = state;

  const watchedStatus = form.watch("status") as AppointmentStatus;
  const watchedCalendarId = form.watch("calendarId");
  const selectedCalendarOption = calendarOptions.find(
    (option) => option.value === watchedCalendarId,
  );

  const fieldLabelClass = FORM_DRAWER_FIELD_LABEL_CLASS;
  const fieldControlClass = FORM_DRAWER_FIELD_CONTROL_CLASS;
  const formItemClass = FORM_DRAWER_FORM_ITEM_CLASS;

  return (
    <div>
      <FormField
        control={form.control}
        name="contactId"
        render={({ field }) => (
          <FormItem className={formItemClass}>
            <FormLabel className={fieldLabelClass}>Contact</FormLabel>
            <ContactPicker
              value={field.value}
              onValueChange={field.onChange}
              onContactSelect={handleContactSelect}
              disabled={lockContact}
              placeholder="Search or add contact…"
              locked={lockContact}
              lockedContact={
                lockContact && defaultContactId && defaultContactLabel
                  ? { id: defaultContactId, label: defaultContactLabel }
                  : undefined
              }
              triggerClassName={fieldControlClass}
            />
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="calendarId"
        render={({ field }) => (
          <FormItem className={formItemClass}>
            <FormLabel className={fieldLabelClass}>Calendar</FormLabel>
            <Select
              value={field.value || null}
              onValueChange={(value) => field.onChange(value ?? "")}
              disabled={mutation.isPending}
            >
              <SelectTrigger className={cn("w-full", fieldControlClass)}>
                <span className="flex min-w-0 items-center gap-2.5">
                  <AppointmentColorDot color={selectedCalendarOption?.color} />
                  <span className="truncate font-medium">
                    {selectedCalendarOption?.label ?? "Select calendar"}
                  </span>
                </span>
              </SelectTrigger>
              <SelectContent>
                {calendarOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    label={option.label}
                  >
                    <span className="flex items-center gap-2">
                      <AppointmentColorDot color={option.color} />
                      <span>{option.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <AppointmentScheduleFields
        selectedCalendar={selectedCalendar}
        timezone={displayTimezone}
        disabled={mutation.isPending}
      />

      <AppointmentPackageField />

      {isEdit ? (
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem className={formItemClass}>
              <FormLabel className={fieldLabelClass}>Title</FormLabel>
              <FormControl>
                <Input className={fieldControlClass} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : (
        <input type="hidden" {...form.register("title")} />
      )}

      <FormField
        control={form.control}
        name="status"
        render={({ field }) => (
          <FormItem className={formItemClass}>
            <FormLabel className={fieldLabelClass}>Status</FormLabel>
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={mutation.isPending}
            >
              <SelectTrigger className={cn("w-full", fieldControlClass)}>
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={`size-[9px] shrink-0 rounded-full ${APPOINTMENT_STATUS_DOT_CLASS[watchedStatus]}`}
                    aria-hidden
                  />
                  <span className="truncate font-medium">
                    {APPOINTMENT_LIFECYCLE_STATUS_OPTIONS.find(
                      (option) => option.value === field.value,
                    )?.label ?? "Select status"}
                  </span>
                </span>
              </SelectTrigger>
              <SelectContent>
                {APPOINTMENT_LIFECYCLE_STATUS_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    label={option.label}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`size-[9px] shrink-0 rounded-full ${APPOINTMENT_STATUS_DOT_CLASS[option.value as AppointmentStatus]}`}
                        aria-hidden
                      />
                      <span>{option.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {canAssign ? (
        <FormField
          control={form.control}
          name="assignedToId"
          render={({ field }) => (
            <FormItem className={formItemClass}>
              <FormLabel className={fieldLabelClass}>
                <OptionalFieldLabel>Assigned staff</OptionalFieldLabel>
              </FormLabel>
              <div className="relative">
                <User className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
                <SearchableSelect
                  items={[{ value: "", label: "Unassigned" }, ...memberOptions]}
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  placeholder="Select team member"
                  triggerClassName={cn(fieldControlClass, "pl-9 font-medium")}
                  inDialog
                />
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      <div className={FORM_DRAWER_FORM_DIVIDER_CLASS} aria-hidden />

      <AppointmentMeetingLocationFields
        selectedCalendar={selectedCalendar}
        locationMode={locationMode}
        onLocationModeChange={setLocationMode as (m: AppointmentLocationMode) => void}
        disabled={mutation.isPending}
      />

      {!showDescription || !showNotes ? (
        <>
          <div className={FORM_DRAWER_FORM_DIVIDER_CLASS} aria-hidden />
          <div className="space-y-2.5">
            {!showDescription ? (
              <AppointmentFormAddButton
                label="Add description"
                disabled={mutation.isPending}
                onClick={() => setShowDescription(true)}
              />
            ) : null}
            {!showNotes ? (
              <AppointmentFormAddButton
                label="Add internal notes"
                disabled={mutation.isPending}
                onClick={() => setShowNotes(true)}
              />
            ) : null}
          </div>
        </>
      ) : null}

      {showDescription ? (
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem className={cn(formItemClass, "mt-4")}>
              <FormLabel className={fieldLabelClass}>
                <OptionalFieldLabel>Description</OptionalFieldLabel>
              </FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="Notes visible to the customer (optional)"
                  className={cn(fieldControlClass, "h-auto min-h-[5.5rem] py-3")}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      {showNotes ? (
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem className={cn(formItemClass, showDescription ? "" : "mt-4")}>
              <FormLabel className={fieldLabelClass}>
                <OptionalFieldLabel>Internal notes</OptionalFieldLabel>
              </FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  placeholder="Private team notes (optional)"
                  className={cn(fieldControlClass, "h-auto min-h-[4.5rem] py-3")}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
    </div>
  );
}
