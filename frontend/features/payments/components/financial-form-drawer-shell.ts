import { DRAWER_SHEET_FOOTER_WIDE_CLASS } from "@/components/forms/drawer-sheet";

/** Slide-in shell for invoice, estimate, and payment forms (wider than generic entity drawers). */
export const FINANCIAL_DRAWER_SHEET_CLASS =
  "[--sheet-width:min(94vw,640px)] !top-0 !right-0 !bottom-0 !left-auto !h-full !max-h-none !w-full !max-w-[var(--sheet-width)] !translate-x-0 !translate-y-0 rounded-none border-l shadow-elevation-lg [&_[data-slot=sheet-close]]:top-[22px] [&_[data-slot=sheet-close]]:right-6 [&_[data-slot=sheet-close]]:size-[34px] [&_[data-slot=sheet-close]]:rounded-[9px] [&_[data-slot=sheet-close]]:border [&_[data-slot=sheet-close]]:border-border [&_[data-slot=sheet-close]]:bg-background [&_[data-slot=sheet-close]]:text-muted-foreground [&_[data-slot=sheet-close]]:hover:bg-muted/40 [&_[data-slot=sheet-close]]:hover:text-foreground";

export const FINANCIAL_DRAWER_HEADER_CLASS =
  "relative shrink-0 border-b border-border/70 bg-[radial-gradient(120%_140%_at_0%_0%,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_55%),linear-gradient(135deg,var(--background)_0%,color-mix(in_oklch,var(--primary)_4%,var(--background))_100%)] px-7 pb-5 pt-6 pr-14";

export const FINANCIAL_DRAWER_TITLE_CLASS =
  "text-xl font-semibold tracking-tight";

export const FINANCIAL_DRAWER_DESCRIPTION_CLASS =
  "mt-1 text-[13px] leading-relaxed text-muted-foreground";

export const FINANCIAL_DRAWER_CONTENT_CLASS =
  "space-y-4 px-7 py-5 scrollbar-thin";

export const FINANCIAL_DRAWER_FOOTER_CLASS = DRAWER_SHEET_FOOTER_WIDE_CLASS;
