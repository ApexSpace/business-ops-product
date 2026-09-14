import { describe, expect, it, vi } from "vitest";
import {
  CHECKOUT_STILL_OPEN_MESSAGE,
  isCheckoutSettled,
  pollUntilCheckoutSettled,
} from "./checkout-settlement";

describe("isCheckoutSettled", () => {
  it("treats a still-open sale as unsettled", () => {
    expect(isCheckoutSettled({ isOpen: true })).toBe(false);
  });

  it("treats !isOpen (PAID, PARTIAL, VOID) as settled", () => {
    expect(isCheckoutSettled({ isOpen: false })).toBe(true);
  });
});

describe("pollUntilCheckoutSettled", () => {
  it("returns when the sale is no longer open", async () => {
    const fetchCheckout = vi
      .fn()
      .mockResolvedValueOnce({ id: "sale-1", isOpen: true })
      .mockResolvedValueOnce({ id: "sale-1", isOpen: false });
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(
      pollUntilCheckoutSettled(fetchCheckout, {
        maxAttempts: 5,
        intervalMs: 10,
        sleep,
      }),
    ).resolves.toEqual({ id: "sale-1", isOpen: false });
    expect(fetchCheckout).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("fails if the sale is still open after the timeout", async () => {
    const fetchCheckout = vi
      .fn()
      .mockResolvedValue({ id: "sale-1", isOpen: true });
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(
      pollUntilCheckoutSettled(fetchCheckout, {
        maxAttempts: 3,
        intervalMs: 10,
        sleep,
      }),
    ).rejects.toThrow(CHECKOUT_STILL_OPEN_MESSAGE);
    expect(fetchCheckout).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });
});
