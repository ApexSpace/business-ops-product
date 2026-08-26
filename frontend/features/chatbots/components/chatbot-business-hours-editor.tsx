"use client";

import { useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BookingTimezoneSelect } from "@/features/public-booking/components/booking-timezone-select";
import {
  businessHoursToSlots,
  defaultBusinessHoursSchedule,
  hasConfiguredSchedule,
  slotsToBusinessHoursSchedule,
  type BusinessHoursDaySlot,
  type ChatbotBusinessHoursSettings,
} from "@/features/chatbots/utils/chatbot-business-hours.util";

interface ChatbotBusinessHoursEditorProps {
  settings: ChatbotBusinessHoursSettings;
  businessHoursOnly: boolean;
  defaultTimezone: string;
  onChange: (
    settings: ChatbotBusinessHoursSettings,
    businessHoursOnly: boolean,
  ) => void;
}

export function ChatbotBusinessHoursEditor({
  settings,
  businessHoursOnly,
  defaultTimezone,
  onChange,
}: ChatbotBusinessHoursEditorProps) {
  const displaySettings = useMemo(() => {
    if (hasConfiguredSchedule(settings.schedule)) {
      return settings;
    }
    return {
      ...settings,
      timezone: settings.timezone || defaultTimezone,
      schedule: defaultBusinessHoursSchedule(),
    };
  }, [defaultTimezone, settings]);

  const slots = useMemo(
    () => businessHoursToSlots(displaySettings),
    [displaySettings],
  );

  const emit = (
    nextSettings: ChatbotBusinessHoursSettings,
    nextBusinessHoursOnly: boolean,
  ) => {
    onChange(
      {
        ...nextSettings,
        timezone: nextSettings.timezone || defaultTimezone,
      },
      nextBusinessHoursOnly,
    );
  };

  const updateSlots = (nextSlots: BusinessHoursDaySlot[]) => {
    emit(
      {
        ...displaySettings,
        schedule: slotsToBusinessHoursSchedule(nextSlots),
      },
      businessHoursOnly,
    );
  };

  const handleToggleEnforcement = (enabled: boolean) => {
    emit(
      {
        ...displaySettings,
        enabled,
      },
      enabled,
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 p-4">
        <div className="space-y-1">
          <Label htmlFor="chatbot-business-hours-only">
            Only accept messages during business hours
          </Label>
          <p className="text-xs text-muted-foreground">
            {businessHoursOnly
              ? "Visitors can chat during the schedule below. Outside those hours they see your offline message."
              : "Schedule is saved below but not enforced — visitors can chat at any time."}
          </p>
        </div>
        <Switch
          id="chatbot-business-hours-only"
          checked={businessHoursOnly}
          onCheckedChange={handleToggleEnforcement}
        />
      </div>

      <BookingTimezoneSelect
        value={displaySettings.timezone || defaultTimezone}
        onChange={(timezone) =>
          emit(
            {
              ...displaySettings,
              timezone,
            },
            businessHoursOnly,
          )
        }
      />

      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium">Weekly schedule</p>
          <p className="text-xs text-muted-foreground">
            Set which days and times your team is available for live chat.
          </p>
        </div>
        {slots.map((slot, index) => (
          <div
            key={slot.weekday}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 p-3"
          >
            <label className="flex min-w-[120px] items-center gap-2 text-sm">
              <Checkbox
                checked={slot.isEnabled}
                onCheckedChange={(checked) => {
                  const next = [...slots];
                  next[index] = { ...slot, isEnabled: checked === true,
};
                  updateSlots(next);
                }}
              />
              {slot.label}
            </label>
            <Input
              type="time"
              className="w-28"
              disabled={!slot.isEnabled}
              value={slot.start}
              onChange={(e) => {
                const next = [...slots];
                next[index] = { ...slot, start: e.target.value,
};
                updateSlots(next);
              }}
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="time"
              className="w-28"
              disabled={!slot.isEnabled}
              value={slot.end}
              onChange={(e) => {
                const next = [...slots];
                next[index] = { ...slot, end: e.target.value,
};
                updateSlots(next);
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
