"use client";

import { Plus } from "lucide-react";
import { MobileEntityList } from "@/components/mobile/mobile-entity-list";
import { Button } from "@/components/ui/button";
import type { TimeCardListItem } from "@/features/time-clock/types";

export interface TimeCardsMobileListProps {
  cards: TimeCardListItem[];
  isLoading?: boolean;
  selectedId: string | null;
  onSelect: (row: TimeCardListItem) => void;
  onOpenOptions: () => void;
  onCreate: () => void;
}

export function TimeCardsMobileList({
  cards,
  isLoading = false,
  selectedId,
  onSelect,
  onOpenOptions,
  onCreate,
}: TimeCardsMobileListProps) {
  return (
    <MobileEntityList
      title="Time cards"
      items={cards}
      getId={(row) => row.id}
      getRow={(row) => {
        const out = row.clockOutTime?.trim() || "—";
        return {
          primary: row.staff.name,
          meta: `${row.dayDisplay} · ${row.clockInTime} – ${out}`,
          amount: row.paidHoursDisplay?.trim() || "—",
          ariaLabel: `${row.staff.name}, ${row.dayDisplay}`,
        };
      }}
      selectedId={selectedId}
      onSelect={onSelect}
      search=""
      onSearchChange={() => undefined}
      showSearch={false}
      onFilter={onOpenOptions}
      filterLabel="Time card options"
      onCreate={onCreate}
      createLabel="Add time card"
      canCreate
      isLoading={isLoading}
      loadingMessage="Loading time cards…"
      emptyTitle="No time cards yet"
      emptyDescription="Add a time card or adjust your filters."
      emptyAction={
        <Button size="sm" onClick={onCreate}>
          <Plus className="mr-1.5 size-4" />
          Add time card
        </Button>
      }
    />
  );
}
