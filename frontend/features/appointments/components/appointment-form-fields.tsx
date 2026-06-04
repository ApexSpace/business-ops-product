"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactPicker } from "@/features/contacts/components/contact-picker";
import { AppointmentMeetingLocationFields } from "@/features/appointments/components/appointment-meeting-location-fields";
import { AppointmentScheduleFields } from "@/features/appointments/components/appointment-schedule-fields";
import { SearchableSelect } from "@/components/forms/searchable-select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { APPOINTMENT_STATUS_OPTIONS } from "@/features/appointments/schemas/appointment-profile";
import type { UseAppointmentFormReturn } from "@/features/appointments/hooks/use-appointment-form";
import type { AppointmentLocationMode } from "@/features/calendars/schemas/calendar-profile";

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

  return (
    <>
      <FormField
        control={form.control}
        name="contactId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Contact</FormLabel>
            <ContactPicker
              value={field.value}
              onValueChange={field.onChange}
              onContactSelect={handleContactSelect}
              disabled={lockContact}
              lockedContact={
                lockContact && defaultContactId && defaultContactLabel
                  ? { id: defaultContactId, label: defaultContactLabel }
                  : undefined
              }
            />
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="calendarId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Calendar</FormLabel>
            <SearchableSelect
              items={calendarOptions}
              value={field.value}
              onValueChange={field.onChange}
              placeholder="Select calendar"
            />
            <FormMessage />
          </FormItem>
        )}
      />

      <AppointmentScheduleFields
        selectedCalendar={selectedCalendar}
        timezone={displayTimezone}
        disabled={mutation.isPending}
      />

      {isEdit ? (
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} />
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
          <FormItem>
            <FormLabel>Status</FormLabel>
            <SearchableSelect
              items={APPOINTMENT_STATUS_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
              value={field.value}
              onValueChange={field.onChange}
            />
            <FormMessage />
          </FormItem>
        )}
      />

      {canAssign ? (
        <FormField
          control={form.control}
          name="assignedToId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assigned staff (optional)</FormLabel>
              <SearchableSelect
                items={[{ value: "", label: "Unassigned" }, ...memberOptions]}
                value={field.value ?? ""}
                onValueChange={field.onChange}
                placeholder="Select team member"
              />
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      <AppointmentMeetingLocationFields
        selectedCalendar={selectedCalendar}
        locationMode={locationMode}
        onLocationModeChange={setLocationMode as (m: AppointmentLocationMode) => void}
        disabled={mutation.isPending}
      />

      {!showDescription || !showNotes ? (
        <div className="flex flex-wrap gap-2">
          {!showDescription ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDescription(true)}
            >
              <Plus className="mr-1.5 size-3.5" />
              Add description
            </Button>
          ) : null}
          {!showNotes ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowNotes(true)}
            >
              <Plus className="mr-1.5 size-3.5" />
              Add internal notes
            </Button>
          ) : null}
        </div>
      ) : null}

      {showDescription ? (
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="Notes visible to the customer (optional)"
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
            <FormItem>
              <FormLabel>Internal notes</FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  placeholder="Private team notes (optional)"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}
    </>
  );
}
