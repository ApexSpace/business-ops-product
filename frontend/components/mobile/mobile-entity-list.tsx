"use client";

import { MobileEntityListItem } from "@/components/mobile/mobile-entity-list-item";
import {
  MobileEntityListScreen,
  type MobileEntityListScreenProps,
} from "@/components/mobile/mobile-entity-list-screen";

export type MobileEntityListRow = {
  primary: string;
  meta: string;
  amount?: string;
  status?: React.ReactNode;
  ariaLabel?: string;
};

export type MobileEntityListProps<T> = Omit<
  MobileEntityListScreenProps,
  "children" | "isEmpty"
> & {
  items: T[];
  getId: (item: T) => string;
  getRow: (item: T) => MobileEntityListRow;
  selectedId: string | null;
  onSelect: (item: T) => void;
};

/**
 * Shared mobile entity list: screen chrome + mapped rows.
 * Bottom nav is owned by AppShell.
 * Features supply data and row mapping only.
 */
export function MobileEntityList<T>({
  items,
  getId,
  getRow,
  selectedId,
  onSelect,
  ...screen
}: MobileEntityListProps<T>) {
  return (
    <MobileEntityListScreen
      {...screen}
      isEmpty={items.length === 0}
    >
      <ul className="m-0 list-none p-0">
        {items.map((item) => {
          const id = getId(item);
          const row = getRow(item);
          return (
            <li key={id}>
              <MobileEntityListItem
                primary={row.primary}
                meta={row.meta}
                amount={row.amount}
                status={row.status}
                active={selectedId === id}
                onClick={() => onSelect(item)}
                aria-label={row.ariaLabel}
              />
            </li>
          );
        })}
      </ul>
    </MobileEntityListScreen>
  );
}
