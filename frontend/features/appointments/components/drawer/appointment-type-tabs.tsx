"use client";

import { DrawerSegmentedTabs } from "@/components/drawer/drawer-segmented-tabs";
import { cn } from "@/lib/utils";

export type AppointmentTypeTab = "appointment" | "time-block";

export interface AppointmentTypeTabsProps {
  value?: AppointmentTypeTab;
  onTimeBlockClick?: () => void;
  onAppointmentClick?: () => void;
  className?: string;
  size?: "default" | "sm";
}

export function AppointmentTypeTabs({
  value = "appointment",
  onTimeBlockClick,
  onAppointmentClick,
  className,
  size = "default",
}: AppointmentTypeTabsProps) {
  return (
    <DrawerSegmentedTabs
      value={value}
      size={size}
      className={cn(className)}
      options={[
        {
          value: "appointment",
          label: "Appointment",
          onClick:
            value === "time-block" && onAppointmentClick
              ? (event: React.MouseEvent) => {
                  event.preventDefault();
                  onAppointmentClick();
                }
              : undefined,
        },
        {
          value: "time-block",
          label: "Time block",
          onClick: onTimeBlockClick
            ? (event: React.MouseEvent) => {
                event.preventDefault();
                onTimeBlockClick();
              }
            : undefined,
        },
      ]}
    />
  );
}
