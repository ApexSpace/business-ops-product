"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { SettingsFormGrid } from "@/components/forms/settings-form-grid";
import type { OnlineBookingSettings } from "@/features/online-booking-settings/api/online-booking-settings.api";

const GAP_MINUTE_OPTIONS = [
  { value: "none", label: "No limit" },
  { value: "0", label: "0 min" },
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "60 min" },
  { value: "90", label: "90 min" },
  { value: "120", label: "120 min" },
];

const MIN_GAP_OPTIONS = [
  { value: "none", label: "No minimum" },
  ...GAP_MINUTE_OPTIONS.filter((option) => option.value !== "none"),
];

function toSelectValue(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "none";
  return String(minutes);
}

function fromSelectValue(value: string): number | null {
  if (value === "none") return null;
  return Number(value);
}

type Props = {
  data: OnlineBookingSettings;
  disabled?: boolean;
  onSave: (body: Record<string, unknown>) => void;
};

function RadioOption({
  id,
  value,
  title,
  description,
}: {
  id: string;
  value: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border p-3">
      <RadioGroupItem id={id} value={value} className="mt-0.5" />
      <div className="space-y-1">
        <Label htmlFor={id} className="font-medium">
          {title}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function AvoidGapsSettingsSection({ data, disabled, onSave }: Props) {
  const maxGapValue = toSelectValue(data.avoidGapsMaxGapMinutes);
  const minGapValue = toSelectValue(data.avoidGapsMinGapMinutes);
  const showStrictNote = data.avoidGapsEnabled && maxGapValue === "0";

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label>Avoid gaps between appointments</Label>
          <p className="text-xs text-muted-foreground">
            Restrict online booking times so the schedule stays tight.
          </p>
        </div>
        <Switch
          checked={data.avoidGapsEnabled}
          disabled={disabled}
          onCheckedChange={(enabled) =>
            onSave({
              avoidGapsEnabled: enabled,
              ...(enabled && data.avoidGapsMaxGapMinutes == null
                ? { avoidGapsMaxGapMinutes: 0 }
                : {}),
            })
          }
        />
      </div>

      {data.avoidGapsEnabled ? (
        <div className="space-y-4 border-t pt-4">
          <SettingsFormGrid>
            <div className="space-y-2">
              <Label htmlFor="avoid-gaps-max">Don&apos;t allow gaps larger than</Label>
              <select
                id="avoid-gaps-max"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={maxGapValue}
                disabled={disabled}
                onChange={(e) =>
                  onSave({ avoidGapsMaxGapMinutes: fromSelectValue(e.target.value) })
                }
              >
                {GAP_MINUTE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="avoid-gaps-min">Don&apos;t allow gaps smaller than</Label>
              <select
                id="avoid-gaps-min"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={minGapValue}
                disabled={disabled}
                onChange={(e) =>
                  onSave({ avoidGapsMinGapMinutes: fromSelectValue(e.target.value) })
                }
              >
                {MIN_GAP_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </SettingsFormGrid>

          {showStrictNote ? (
            <div className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
              Only times directly next to an existing appointment or time block
              will be offered in online booking.
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>How should time blocks be treated?</Label>
            <RadioGroup
              value={data.avoidGapsTimeBlockMode}
              disabled={disabled}
              onValueChange={(value) => onSave({ avoidGapsTimeBlockMode: value })}
            >
              <RadioOption
                id="time-block-ignore"
                value="IGNORE"
                title="Ignore time blocks"
                description="Times offered will not cluster around time blocks."
              />
              <RadioOption
                id="time-block-same"
                value="SAME_AS_APPOINTMENTS"
                title="Same as appointments"
                description="Times offered will cluster around time blocks, like appointments."
              />
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Days with no appointments at all</Label>
            <RadioGroup
              value={data.avoidGapsEmptyDayMode}
              disabled={disabled}
              onValueChange={(value) => onSave({ avoidGapsEmptyDayMode: value })}
            >
              <RadioOption
                id="empty-day-all"
                value="ALL_TIMES"
                title="Offer all available times"
                description="Offer any available time on days with no appointments. Once the first appointment is booked, gaps will be avoided based on your settings."
              />
              <RadioOption
                id="empty-day-edges"
                value="SHIFT_EDGES_ONLY"
                title="Only offer the first and last time of each shift"
                description="Only offer the first and last available time per shift. Once the first appointment is booked, gaps will be avoided based on your settings."
              />
            </RadioGroup>
          </div>

          {data.allowMultipleServices ? (
            <div className="space-y-2">
              <Label>Multi-provider bookings</Label>
              <RadioGroup
                value={data.avoidGapsMultiProviderMode}
                disabled={disabled}
                onValueChange={(value) =>
                  onSave({ avoidGapsMultiProviderMode: value })
                }
              >
                <RadioOption
                  id="multi-provider-same"
                  value="SAME_AS_SINGLE"
                  title="Same as single provider bookings"
                  description="Avoid gaps in all providers' schedules. This may limit availability."
                />
                <RadioOption
                  id="multi-provider-allow"
                  value="ALLOW_GAPS"
                  title="Allow gaps"
                  description="Clients can book any open time per provider even if it creates gaps."
                />
              </RadioGroup>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
