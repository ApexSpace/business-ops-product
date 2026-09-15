"use client";

import { cn } from "@/lib/utils";
import {
  MOBILE_LIST_AMOUNT_TEXT_CLASS,
  MOBILE_LIST_ITEM_ACTIVE_CLASS,
  MOBILE_LIST_ITEM_CLASS,
  MOBILE_LIST_META_TEXT_CLASS,
  MOBILE_LIST_PRIMARY_TEXT_CLASS,
} from "@/lib/design/mobile-list-tokens";

export interface MobileEntityListItemProps {
  primary: string;
  meta: string;
  /** Trailing value (money, phone, hours). Omit when the row has no trailing metric. */
  amount?: string;
  /** Optional status capsule under the amount (sales). Omit for amount-only rows (transactions). */
  status?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  "aria-label"?: string;
}

/**
 * Figma sales / transactions list row:
 * name + amount (space-between) · meta + status (space-between).
 * Shared by every mobile entity list.
 */
export function MobileEntityListItem({
  primary,
  meta,
  amount,
  status,
  active = false,
  onClick,
  className,
  "aria-label": ariaLabel,
}: MobileEntityListItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        ariaLabel ?? (amount ? `${primary}, ${amount}` : primary)
      }
      aria-current={active ? "true" : undefined}
      className={cn(
        MOBILE_LIST_ITEM_CLASS,
        active && MOBILE_LIST_ITEM_ACTIVE_CLASS,
        className,
      )}
    >
      <div className="flex w-full min-w-0 items-center justify-between gap-3">
        <span className={cn(MOBILE_LIST_PRIMARY_TEXT_CLASS, "min-w-0 flex-1")}>
          {primary}
        </span>
        {amount ? (
          <span className={MOBILE_LIST_AMOUNT_TEXT_CLASS}>{amount}</span>
        ) : null}
      </div>
      <div className="flex w-full min-w-0 items-center justify-between gap-3">
        <span className={cn(MOBILE_LIST_META_TEXT_CLASS, "min-w-0 flex-1")}>
          {meta}
        </span>
        {status ? <div className="shrink-0">{status}</div> : null}
      </div>
    </button>
  );
}
