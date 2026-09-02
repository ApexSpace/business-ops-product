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

export function toAvoidGapsSelectValue(
  minutes: number | null | undefined,
): string {
  if (minutes === null || minutes === undefined) return "none";
  return String(minutes);
}

export function fromAvoidGapsSelectValue(value: string): number | null {
  if (value === "none") return null;
  return Number(value);
}

export type AvoidGapsDraft = Pick<
  OnlineBookingSettings,
  | "avoidGapsEnabled"
  | "avoidGapsMaxGapMinutes"
  | "avoidGapsMinGapMinutes"
  | "avoidGapsTimeBlockMode"
  | "avoidGapsEmptyDayMode"
  | "avoidGapsMultiProviderMode"
  | "allowMultipleServices"
>;

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

type AvoidGapsFormFieldsProps = {
  draft: AvoidGapsDraft;
  disabled?: boolean;
  onChange: (patch: Partial<AvoidGapsDraft>) => void;
};

export function AvoidGapsFormFields({
  draft,
  disabled,
  onChange,
}: AvoidGapsFormFieldsProps) {
  const maxGapValue = toAvoidGapsSelectValue(draft.avoidGapsMaxGapMinutes);
  const minGapValue = toAvoidGapsSelectValue(draft.avoidGapsMinGapMinutes);
  const showStrictNote = draft.avoidGapsEnabled && maxGapValue === "0";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="avoid-gaps-enabled">Avoid gaps between appointments</Label>
          <p className="text-xs text-muted-foreground">
            When enabled, the system only offers times that prevent unwanted
            gaps in service provider schedules.
          </p>
        </div>
        <Switch
          id="avoid-gaps-enabled"
          checked={draft.avoidGapsEnabled}
          disabled={disabled}
          onCheckedChange={(enabled) =>
            onChange({
              avoidGapsEnabled: enabled,
              ...(enabled && draft.avoidGapsMaxGapMinutes == null
                ? { avoidGapsMaxGapMinutes: 0 }
                : {}),
            })
          }
        />
      </div>

      {draft.avoidGapsEnabled ? (
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
                  onChange({
                    avoidGapsMaxGapMinutes: fromAvoidGapsSelectValue(
                      e.target.value,
                    ),
                  })
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
                  onChange({
                    avoidGapsMinGapMinutes: fromAvoidGapsSelectValue(
                      e.target.value,
                    ),
                  })
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
              value={draft.avoidGapsTimeBlockMode}
              disabled={disabled}
              onValueChange={(value) =>
                onChange({ avoidGapsTimeBlockMode: value })
              }
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
              value={draft.avoidGapsEmptyDayMode}
              disabled={disabled}
              onValueChange={(value) =>
                onChange({ avoidGapsEmptyDayMode: value })
              }
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

          {draft.allowMultipleServices ? (
            <div className="space-y-2">
              <Label>Multi-provider bookings</Label>
              <RadioGroup
                value={draft.avoidGapsMultiProviderMode}
                disabled={disabled}
                onValueChange={(value) =>
                  onChange({ avoidGapsMultiProviderMode: value })
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

export function pickAvoidGapsDraft(
  settings: OnlineBookingSettings,
): AvoidGapsDraft {
  return {
    avoidGapsEnabled: settings.avoidGapsEnabled,
    avoidGapsMaxGapMinutes: settings.avoidGapsMaxGapMinutes,
    avoidGapsMinGapMinutes: settings.avoidGapsMinGapMinutes,
    avoidGapsTimeBlockMode: settings.avoidGapsTimeBlockMode,
    avoidGapsEmptyDayMode: settings.avoidGapsEmptyDayMode,
    avoidGapsMultiProviderMode: settings.avoidGapsMultiProviderMode,
    allowMultipleServices: settings.allowMultipleServices,
  };
}
