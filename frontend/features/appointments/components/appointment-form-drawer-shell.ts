import { DRAWER_SHEET_FOOTER_WIDE_CLASS } from "@/components/forms/drawer-sheet";

/** Slide-in shell for the appointment create/edit drawer (wider than generic entity drawers). */
export const APPOINTMENT_DRAWER_SHEET_CLASS =
  "[--sheet-width:min(94vw,600px)] shadow-elevation-lg [&_[data-slot=sheet-close]]:top-[22px] [&_[data-slot=sheet-close]]:right-6 [&_[data-slot=sheet-close]]:size-[34px] [&_[data-slot=sheet-close]]:rounded-[9px] [&_[data-slot=sheet-close]]:border [&_[data-slot=sheet-close]]:border-border [&_[data-slot=sheet-close]]:bg-background [&_[data-slot=sheet-close]]:text-muted-foreground [&_[data-slot=sheet-close]]:hover:bg-muted/40 [&_[data-slot=sheet-close]]:hover:text-foreground";

export const APPOINTMENT_DRAWER_HEADER_CLASS =
  "relative shrink-0 border-b border-border/70 bg-[radial-gradient(120%_140%_at_0%_0%,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_55%),linear-gradient(135deg,var(--background)_0%,color-mix(in_oklch,var(--primary)_4%,var(--background))_100%)] px-[30px] pb-[22px] pt-[26px] pr-14";

export const APPOINTMENT_DRAWER_TITLE_CLASS =
  "text-[21px] font-semibold tracking-tight";

export const APPOINTMENT_DRAWER_DESCRIPTION_CLASS =
  "mt-1 text-[13px] leading-relaxed text-muted-foreground";

export const APPOINTMENT_DRAWER_CONTENT_CLASS =
  "space-y-0 px-[30px] py-[26px] scrollbar-thin";

export const APPOINTMENT_DRAWER_FOOTER_CLASS = DRAWER_SHEET_FOOTER_WIDE_CLASS;

/** Shared field styling aligned with the appointment drawer mockup. */
export const APPOINTMENT_FIELD_CONTROL_CLASS =
  "h-11 rounded-[10px] border-[1.5px] text-[13.5px] shadow-none focus-visible:border-ring focus-visible:ring-[4px] focus-visible:ring-ring/15";

export const APPOINTMENT_FIELD_LABEL_CLASS =
  "flex items-center gap-1 text-[12.5px] font-semibold text-muted-foreground";

export const APPOINTMENT_FORM_ITEM_CLASS = "mb-4 gap-[7px]";

export const APPOINTMENT_FORM_DIVIDER_CLASS = "my-[22px] h-px bg-border/60";
