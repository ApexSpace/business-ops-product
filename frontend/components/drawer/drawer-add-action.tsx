"use client";

import { PlusIconButton } from "@/components/drawer/drawer-icons";
import { DRAWER_ADD_ACTION_CLASS } from "@/lib/design/drawer-tokens";
import { cn } from "@/lib/utils";

export interface DrawerAddActionProps {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  /**
   * Purple plus square before the label.
   * Default on — this is the drawer/sidebar add-link pattern.
   * List-page / DataTable CTAs use `ListPrimaryAction` (no plus on labeled buttons).
   */
  showIcon?: boolean;
  /** `sidebar` = dense nav; `page` = content CTAs (CSS vars for hit-and-trial). */
  size?: "sidebar" | "page";
}

/**
 * Shared sidebar/page add link: purple plus square + label (Add Service, Add Note, …).
 */
export function DrawerAddAction({
  label,
  onClick,
  disabled,
  className,
  showIcon = true,
  size = "sidebar",
}: DrawerAddActionProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        DRAWER_ADD_ACTION_CLASS,
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      onClick={onClick}
    >
      {showIcon ? <PlusIconButton as="span" size={size} /> : null}
      {label}
    </button>
  );
}
