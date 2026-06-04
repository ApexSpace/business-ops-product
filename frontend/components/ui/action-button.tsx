"use client";

import type { ComponentProps } from "react";
import { Button, type buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";

/** Matches `--control-height` (form fields, dialog footers, list CTAs). */
export const ACTION_BUTTON_SIZE = "default" as const;

export type ActionButtonProps = ComponentProps<typeof Button> &
  VariantProps<typeof buttonVariants>;

/**
 * Standard action control for Save, Cancel, Create, Delete, and list-page CTAs.
 * Toolbar filters use `var(--control-height)` via `lib/ui/control-styles.ts` (same height as this button).
 */
export function ActionButton({
  size = ACTION_BUTTON_SIZE,
  ...props
}: ActionButtonProps) {
  return <Button size={size} {...props} />;
}
