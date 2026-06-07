import * as React from "react";

/** Matches Tailwind `lg` — mobile + tablet use the step-based booking flow. */
const COMPACT_BOOKING_BREAKPOINT = 1024;

export function useIsCompactBooking() {
  const [isCompact, setIsCompact] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(
      `(max-width: ${COMPACT_BOOKING_BREAKPOINT - 1}px)`,
    );
    const onChange = () => {
      setIsCompact(window.innerWidth < COMPACT_BOOKING_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsCompact(window.innerWidth < COMPACT_BOOKING_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isCompact;
}
