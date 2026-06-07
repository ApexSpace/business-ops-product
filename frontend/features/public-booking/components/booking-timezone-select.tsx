"use client";

import { useMemo } from "react";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { Label } from "@/components/ui/label";
import { getTimezoneOptions } from "@/features/public-booking/utils/timezone-options";

interface BookingTimezoneSelectProps {
  value: string;
  onChange: (tz: string) => void;
}

export function BookingTimezoneSelect({
  value,
  onChange,
}: BookingTimezoneSelectProps) {
  const options = useMemo(() => getTimezoneOptions(), []);

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">Timezone</Label>
      <SearchableSelect
        items={options}
        value={value}
        onValueChange={(v) => v && onChange(v)}
        placeholder="Select timezone"
        searchPlaceholder="Search timezone…"
        triggerClassName="h-11 text-sm sm:h-[var(--control-height)] sm:text-xs"
        contentAlign="start"
        alignItemWithTrigger
      />
    </div>
  );
}
