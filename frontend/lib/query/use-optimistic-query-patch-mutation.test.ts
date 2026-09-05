import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";

/**
 * Unit-test the pure optimistic merge/rollback contract without mounting React.
 * The hook wires these same steps via React Query mutation callbacks.
 */

type Prefs = { enabled: boolean; label: string };

function applyOptimistic(previous: Prefs, variables: { enabled: boolean }): Prefs {
  return { ...previous, enabled: variables.enabled };
}

describe("optimistic query patch contract", () => {
  let queryClient: QueryClient;
  const queryKey = ["prefs"] as const;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData<Prefs>(queryKey, {
      enabled: false,
      label: "Booking",
    });
  });

  it("applies an optimistic patch to cache", () => {
    const previous = queryClient.getQueryData<Prefs>(queryKey)!;
    const next = applyOptimistic(previous, { enabled: true });
    queryClient.setQueryData(queryKey, next);
    expect(queryClient.getQueryData<Prefs>(queryKey)?.enabled).toBe(true);
  });

  it("restores the snapshot on failure", () => {
    const previous = queryClient.getQueryData<Prefs>(queryKey)!;
    queryClient.setQueryData(
      queryKey,
      applyOptimistic(previous, { enabled: true }),
    );
    expect(queryClient.getQueryData<Prefs>(queryKey)?.enabled).toBe(true);

    queryClient.setQueryData(queryKey, previous);
    expect(queryClient.getQueryData<Prefs>(queryKey)?.enabled).toBe(false);
  });

  it("writes server data on success after optimistic patch", () => {
    const previous = queryClient.getQueryData<Prefs>(queryKey)!;
    queryClient.setQueryData(
      queryKey,
      applyOptimistic(previous, { enabled: true }),
    );

    const server: Prefs = { enabled: true, label: "Booking confirmation" };
    queryClient.setQueryData(queryKey, server);
    expect(queryClient.getQueryData<Prefs>(queryKey)).toEqual(server);
  });

  it("keeps unrelated fields when patching", () => {
    const previous = queryClient.getQueryData<Prefs>(queryKey)!;
    const next = applyOptimistic(previous, { enabled: true });
    expect(next.label).toBe("Booking");
    expect(next.enabled).toBe(true);
  });

  it("cancelQueries is safe to call before patching", async () => {
    const cancel = vi.spyOn(queryClient, "cancelQueries");
    await queryClient.cancelQueries({ queryKey });
    expect(cancel).toHaveBeenCalledWith({ queryKey });
  });
});
