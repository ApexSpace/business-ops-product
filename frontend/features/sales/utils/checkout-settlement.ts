export const CHECKOUT_STILL_OPEN_MESSAGE =
  "Sale is still open. Payment may still be processing.";

export function isCheckoutSettled(checkout: { isOpen: boolean }): boolean {
  return checkout.isOpen === false;
}

export async function pollUntilCheckoutSettled<T extends { isOpen: boolean }>(
  fetchCheckout: () => Promise<T>,
  options?: {
    maxAttempts?: number;
    intervalMs?: number;
    sleep?: (ms: number) => Promise<void>;
  },
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 30;
  const intervalMs = options?.intervalMs ?? 500;
  const sleep =
    options?.sleep ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const checkout = await fetchCheckout();
    if (isCheckoutSettled(checkout)) {
      return checkout;
    }
    if (attempt < maxAttempts - 1) {
      await sleep(intervalMs);
    }
  }

  throw new Error(CHECKOUT_STILL_OPEN_MESSAGE);
}
