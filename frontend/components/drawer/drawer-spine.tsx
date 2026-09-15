"use client";

import {
  DRAWER_SPINE_CLASS,
  DRAWER_SPINE_LABEL_CLASS,
} from "@/lib/design/drawer-shell-tokens";
import { cn } from "@/lib/utils";

export interface DrawerSpineProps {
  label: string;
  className?: string;
}

/**
 * Left vertical purpose strip — shared by all DrawerShell sidebars.
 * Size comes from `--drawer-spine-width` / `--drawer-spine-padding-*` in globals.css.
 */
export function DrawerSpine({ label, className }: DrawerSpineProps) {
  return (
    <div className={cn(DRAWER_SPINE_CLASS, className)} aria-hidden>
      <span
        className={DRAWER_SPINE_LABEL_CLASS}
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        {label}
      </span>
    </div>
  );
}
