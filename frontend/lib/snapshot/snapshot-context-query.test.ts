import { describe, expect, it } from "vitest";
import { queryKeys } from "@/lib/query/keys";
import {
  SNAPSHOT_CONTEXT_QUERY_CONFIG,
  snapshotContextQueryOptions,
} from "./snapshot-context-query";

describe("snapshot context query config", () => {
  it("includes businessId in query key", () => {
    expect(queryKeys.business.snapshotContext("biz-123")).toEqual([
      "business",
      "biz-123",
      "snapshot-context",
    ]);
  });

  it("exports zero staleTime and long gcTime", () => {
    expect(SNAPSHOT_CONTEXT_QUERY_CONFIG.staleTime).toBe(0);
    expect(SNAPSHOT_CONTEXT_QUERY_CONFIG.gcTime).toBe(24 * 60 * 60 * 1000);
    expect(SNAPSHOT_CONTEXT_QUERY_CONFIG.refetchOnWindowFocus).toBe(true);
    expect(SNAPSHOT_CONTEXT_QUERY_CONFIG.refetchOnReconnect).toBe(true);
  });

  it("disables query when businessId is missing", () => {
    const options = snapshotContextQueryOptions(undefined);
    expect(options.enabled).toBe(false);
  });

  it("enables query when businessId is present", () => {
    const options = snapshotContextQueryOptions("biz-1");
    expect(options.enabled).toBe(true);
    expect(options.staleTime).toBe(0);
  });
});
