import { cn } from "@/lib/utils";

/**
 * Figma `weui:arrow-filled` for calendar prev/next.
 * Vector leaf: 7.36 × 12.73 (path bbox of Iconify weui/arrow-filled).
 * Forward = 0°; backward = rotate 180°.
 */
const ARROW_PATH =
  "M10.157 12.711L4.5 18.368l-1.414-1.414l4.95-4.95l-4.95-4.95L4.5 5.64l5.657 5.657a1 1 0 0 1 0 1.414";

/** Cropped to the filled chevron path (matches Figma vector bounds). */
const VIEW_BOX = "3.086 5.64 7.071 12.728";

interface CalendarNavArrowIconProps {
  direction: "prev" | "next";
  className?: string;
}

export function CalendarNavArrowIcon({
  direction,
  className,
}: CalendarNavArrowIconProps) {
  return (
    <svg
      width={7.36}
      height={12.73}
      viewBox={VIEW_BOX}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn(
        "block shrink-0 text-[#7E3BED]",
        direction === "prev" && "rotate-180",
        className,
      )}
    >
      <path fill="currentColor" fillRule="evenodd" d={ARROW_PATH} />
    </svg>
  );
}
