"use client";

import { cn } from "@/lib/utils";
import {
  MOBILE_LIST_STATUS_CLOSED_CLASS,
  MOBILE_LIST_STATUS_NEUTRAL_CLASS,
  MOBILE_LIST_STATUS_OPEN_CLASS,
  MOBILE_LIST_STATUS_PILL_BASE_CLASS,
  MOBILE_LIST_STATUS_VOID_CLASS,
} from "@/lib/design/mobile-list-tokens";

export type MobileStatusPillTone = "closed" | "open" | "void" | "neutral";

const TONE_CLASS: Record<MobileStatusPillTone, string> = {
  closed: MOBILE_LIST_STATUS_CLOSED_CLASS,
  open: MOBILE_LIST_STATUS_OPEN_CLASS,
  void: MOBILE_LIST_STATUS_VOID_CLASS,
  neutral: MOBILE_LIST_STATUS_NEUTRAL_CLASS,
};

export interface MobileStatusPillProps {
  label: string;
  tone?: MobileStatusPillTone;
  className?: string;
}

/**
 * Mobile list status capsule — same chrome as StatusPill, Figma mobile tones.
 */
export function MobileStatusPill({
  label,
  tone = "neutral",
  className,
}: MobileStatusPillProps) {
  return (
    <span
      className={cn(
        MOBILE_LIST_STATUS_PILL_BASE_CLASS,
        "text-[12px]",
        TONE_CLASS[tone],
        className,
      )}
      title={label}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}
