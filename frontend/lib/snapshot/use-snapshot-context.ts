"use client";

import { useSnapshotContextValue } from "./snapshot-context-provider";

export function useSnapshotContext() {
  return useSnapshotContextValue();
}
