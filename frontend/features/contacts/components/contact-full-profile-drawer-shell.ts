/** Slide-in shell for the conversation / inbox contact profile drawer. */
export const CONTACT_PROFILE_DRAWER_SHEET_CLASS =
  "[--sheet-width:min(94vw,600px)] shadow-elevation-lg [&_[data-slot=sheet-close]]:top-[22px] [&_[data-slot=sheet-close]]:right-6 [&_[data-slot=sheet-close]]:size-[34px] [&_[data-slot=sheet-close]]:rounded-[9px] [&_[data-slot=sheet-close]]:border [&_[data-slot=sheet-close]]:border-border [&_[data-slot=sheet-close]]:bg-background [&_[data-slot=sheet-close]]:text-muted-foreground [&_[data-slot=sheet-close]]:hover:bg-muted/40 [&_[data-slot=sheet-close]]:hover:text-foreground";

export const CONTACT_PROFILE_DRAWER_HEADER_CLASS =
  "relative shrink-0 border-b border-border/70 bg-[radial-gradient(120%_140%_at_0%_0%,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_55%),linear-gradient(135deg,var(--background)_0%,color-mix(in_oklch,var(--primary)_4%,var(--background))_100%)] px-[30px] pb-[22px] pt-[26px] pr-14";

export const CONTACT_PROFILE_DRAWER_TITLE_CLASS =
  "text-[21px] font-semibold tracking-tight";

export const CONTACT_PROFILE_DRAWER_DESCRIPTION_CLASS =
  "mt-1 text-[13px] leading-relaxed text-muted-foreground";

/** Flex column body — child panels manage their own scroll regions. */
export const CONTACT_PROFILE_DRAWER_BODY_CLASS =
  "flex min-h-0 flex-1 flex-col space-y-0 overflow-hidden !px-[30px] !py-5";
