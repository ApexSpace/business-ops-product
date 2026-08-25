/**
 * Design-token ownership
 * - Visual values: frontend/app/globals.css and frontend/lib/theme/*
 * - This file: auth-shell recipes only (centered layout, field group)
 * - Features must not introduce new raw color / radius / height values
 */

/**
 * Full-viewport auth shell.
 * Uses the same light page surface as the rest of the product (`--background` → `--cs-page`).
 */
export const AUTH_SHELL_CLASS =
  "relative flex min-h-svh flex-col overflow-x-hidden bg-background text-foreground";

export const AUTH_MAIN_CLASS =
  "flex flex-1 flex-col items-center justify-center px-[var(--page-padding-x)] pt-[max(var(--spacing-6),env(safe-area-inset-top))] pb-[max(var(--spacing-6),env(safe-area-inset-bottom))]";

export const AUTH_STACK_CLASS =
  "flex w-full max-w-3xl flex-col items-center gap-[var(--spacing-6)]";

export const AUTH_FORM_SLOT_CLASS = "w-full";

/** Narrow column for login / password forms. */
export const AUTH_CARD_CLASS =
  "mx-auto flex w-full max-w-md flex-col gap-[var(--spacing-4)]";

export const AUTH_FORM_STACK_CLASS = "flex flex-col gap-[var(--spacing-4)]";

export const AUTH_CALLOUT_CLASS =
  "rounded-[var(--radius-control)] border px-[var(--spacing-4)] py-[var(--spacing-2)] text-body-small";

/** Wordmark sits on the light page surface — no extra fill behind the PNG. */
export const AUTH_LOGO_BANNER_CLASS =
  "h-32 w-auto max-h-32 max-w-[min(100%,16rem)] object-contain";

/** Grouped email/password block. `.dark` keeps light input text on the dark well. */
export const AUTH_FIELD_GROUP_CLASS =
  "dark scheme-dark divide-y divide-grey-tertiary-dark-active overflow-hidden rounded-[var(--radius-control)] bg-grey-tertiary-darker focus-within:ring-[3px] focus-within:ring-violet-primary-normal/40";

export const AUTH_FIELD_ROW_CLASS = "px-[var(--spacing-4)] py-[var(--spacing-2)]";

/** Borderless control inside AUTH_FIELD_GROUP_CLASS (overrides glass-control). */
export const AUTH_FIELD_INPUT_CLASS =
  "h-[var(--control-height)] min-h-[var(--control-height)] rounded-none !border-0 !bg-transparent px-0 !shadow-none ring-0 ![backdrop-filter:none] placeholder:text-muted-foreground focus-visible:!border-0 focus-visible:!ring-0 [&:-webkit-autofill]:[-webkit-text-fill-color:var(--foreground)] [&:-webkit-autofill]:[box-shadow:inset_0_0_0_1000px_var(--pc-grey-tertiary-darker)]";

export const AUTH_FOOTER_LINK_CLASS =
  "font-semibold text-foreground no-underline hover:text-violet-primary-light hover:underline";
