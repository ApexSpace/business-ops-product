import { getErrorMessage, parseEnvelope } from "@/lib/api/envelope";
import { ApiClientError } from "@/lib/api/errors";
import type { PublicInvoice } from "@/lib/types/api";

async function publicFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  const url = new URL(`/api/backend/${normalized}`, window.location.origin);

  const res = await fetch(url.toString(), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiClientError(
      getErrorMessage(body, "Request failed"),
      res.status,
      body?.error ?? body,
    );
  }

  return parseEnvelope<T>(body).data;
}

export function getPublicInvoice(token: string) {
  return publicFetch<PublicInvoice>(`public/invoices/${token}`);
}

export function startPublicInvoiceCheckout(token: string) {
  return publicFetch<{ checkoutUrl: string }>(
    `public/invoices/${token}/checkout`,
    { method: "POST" },
  );
}
