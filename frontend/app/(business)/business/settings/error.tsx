"use client";

import { SegmentError } from "@/components/layout/segment-error";

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <SegmentError error={error} reset={reset} title="Could not load settings" />
  );
}
