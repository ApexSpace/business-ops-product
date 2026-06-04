import type { Metric } from "web-vitals";

export function reportWebVitals(metric: Metric): void {
  if (process.env.NODE_ENV === "development") {
    console.debug(`[web-vital] ${metric.name}`, metric.value, metric.id);
  }

  const endpoint = process.env.NEXT_PUBLIC_WEB_VITALS_ENDPOINT;
  if (!endpoint || typeof window === "undefined") return;

  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    id: metric.id,
    rating: metric.rating,
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon(endpoint, body);
    return;
  }

  void fetch(endpoint, {
    method: "POST",
    body,
    keepalive: true,
    headers: { "Content-Type": "application/json" },
  });
}
