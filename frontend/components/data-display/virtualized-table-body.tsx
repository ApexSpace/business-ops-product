"use client";

import { useRef, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

type VirtualizedTableBodyProps<T> = {
  rows: T[];
  rowHeight?: number;
  renderRow: (row: T, index: number) => ReactNode;
  enabled?: boolean;
};

export function VirtualizedTableBody<T>({
  rows,
  rowHeight = 52,
  renderRow,
  enabled = true,
}: VirtualizedTableBodyProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  });

  if (!enabled || rows.length < 50) {
    return <>{rows.map((row, index) => renderRow(row, index))}</>;
  }

  const items = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className="max-h-[min(70vh,720px)] overflow-auto"
      role="rowgroup"
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: "100%",
          position: "relative",
        }}
      >
        {items.map((virtualRow) => {
          const row = rows[virtualRow.index];
          return (
            <div
              key={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderRow(row, virtualRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
