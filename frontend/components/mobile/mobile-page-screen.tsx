"use client";

import {
  MobileListScreenHeader,
  type MobileListScreenHeaderProps,
} from "@/components/mobile/mobile-list-screen-header";
import {
  MOBILE_LIST_BODY_SCROLL_CLASS,
  MOBILE_LIST_BODY_SLOT_CLASS,
} from "@/lib/design/mobile-list-tokens";
import { cn } from "@/lib/utils";

export interface MobilePageScreenProps
  extends Pick<
    MobileListScreenHeaderProps,
    | "title"
    | "onFilter"
    | "onCreate"
    | "canCreate"
    | "filterLabel"
    | "createLabel"
    | "showFilter"
  > {
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

/**
 * Shared mobile page shell — purple top bar + scrollable body.
 * Use for Dashboard and other non-list mobile screens.
 */
export function MobilePageScreen({
  title,
  onFilter,
  onCreate,
  canCreate,
  filterLabel,
  createLabel,
  showFilter = false,
  children,
  className,
  bodyClassName,
}: MobilePageScreenProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-1 flex-col bg-white",
        className,
      )}
    >
      <MobileListScreenHeader
        title={title}
        onFilter={onFilter}
        onCreate={onCreate}
        canCreate={canCreate}
        filterLabel={filterLabel}
        createLabel={createLabel}
        showFilter={showFilter}
      />
      <div className={MOBILE_LIST_BODY_SLOT_CLASS}>
        <div className={cn(MOBILE_LIST_BODY_SCROLL_CLASS, bodyClassName)}>
          {children}
        </div>
      </div>
    </div>
  );
}
