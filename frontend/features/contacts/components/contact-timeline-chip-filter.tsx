"use client";

import { EntityDetailSegmentedFilter } from "@/components/layout/entity-detail-segmented-filter";

export interface ContactTimelineChipOption {
  value: string;
  label: string;
}

interface ContactTimelineChipFilterProps {
  options: readonly ContactTimelineChipOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  "aria-label"?: string;
}

/**
 * Timeline type filters — shared EntityDetailSegmentedFilter pills
 * (Figma: 30px, radius/sm, 8px gap).
 */
export function ContactTimelineChipFilter({
  options,
  value,
  onChange,
  className,
  "aria-label": ariaLabel = "Filter timeline",
}: ContactTimelineChipFilterProps) {
  return (
    <EntityDetailSegmentedFilter
      variant="pills"
      options={[...options]}
      value={value}
      onChange={onChange}
      label={ariaLabel}
      className={className}
    />
  );
}
