"use client";

import {
  APPOINTMENT_DRAWER_SPINE_CLASS,
  APPOINTMENT_DRAWER_SPINE_LABEL_CLASS,
} from "@/features/appointments/styles/appointment-drawer-tokens";
import { cn } from "@/lib/utils";

export interface DrawerSpineProps {
  label: string;
  className?: string;
}

/**
 * Left vertical label strip — separate from the white content panel.
 * Figma: 30px wide, primary/500 (#7E3BED), rounded left corners only.
 */
export function DrawerSpine({ label, className }: DrawerSpineProps) {
  return (
    <div className={cn(APPOINTMENT_DRAWER_SPINE_CLASS, className)} aria-hidden>
      <span
        className={APPOINTMENT_DRAWER_SPINE_LABEL_CLASS}
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        {label}
      </span>
    </div>
  );
}
