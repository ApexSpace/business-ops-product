import { getPublicBackendUrl } from "@/lib/config/public-backend-url";
import type { TrialWizardState } from "../constants";

type Envelope<T> = {
  data?: T;
  message?: string;
  error?: { message?: string } | null;
};

/**
 * Same-origin Next BFF routes. Uses runtime BACKEND_URL on the server so
 * trial signup works even when NEXT_PUBLIC_BACKEND_URL was missing at build.
 */
function trialApiBase(): string {
  if (typeof window !== "undefined") {
    return "";
  }
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${trialApiBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Envelope<T> & {
    message?: string;
  };
  if (!res.ok) {
    const message =
      json.message ||
      (json.error && typeof json.error === "object"
        ? json.error.message
        : null) ||
      "Request failed";
    throw new Error(message);
  }
  if (json.data !== undefined) return json.data;
  return json as unknown as T;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${trialApiBase()}${path}`);
  const json = (await res.json().catch(() => ({}))) as Envelope<T> & {
    message?: string;
  };
  if (!res.ok) {
    throw new Error(json.message || "Request failed");
  }
  if (json.data !== undefined) return json.data;
  return json as unknown as T;
}

export function createOrUpdateTrialSession(input: {
  sessionId?: string | null;
  payload: Partial<
    Pick<
      TrialWizardState,
      | "servicesOffered"
      | "providerCountBand"
      | "firstName"
      | "lastName"
      | "email"
      | "businessName"
      | "website"
    >
  >;
}) {
  return postJson<{
    sessionId: string;
    payload: Record<string, unknown>;
    expiresAt: string;
  }>("/api/public/trial/session", {
    sessionId: input.sessionId || undefined,
    payload: input.payload,
  });
}

export function sendTrialOtp(input: {
  phoneE164: string;
  sessionId?: string | null;
}) {
  return postJson<{ sent: boolean }>("/api/public/trial/phone/send-otp", {
    phoneE164: input.phoneE164,
    sessionId: input.sessionId || undefined,
  });
}

export function verifyTrialOtp(input: { phoneE164: string; code: string }) {
  return postJson<{ phoneVerificationToken: string }>(
    "/api/public/trial/phone/verify-otp",
    input,
  );
}

export function completeTrialSignup(input: {
  sessionId?: string | null;
  servicesOffered: string[];
  providerCountBand: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  businessName: string;
  website?: string;
  phoneVerificationToken: string;
}) {
  return postJson<{ handoffUrl: string; businessId: string }>(
    "/api/public/trial/complete",
    {
      ...input,
      sessionId: input.sessionId || undefined,
      website: input.website || undefined,
    },
  );
}

export function fetchTrialEmbedSnippet() {
  return getJson<{ scriptEmbed: string; iframeSrc: string }>(
    "/api/public/trial/embed",
  );
}

export function getTrialEmbedCodeFallback(): string | null {
  if (typeof window === "undefined") return null;
  const backend = getPublicBackendUrl();
  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    window.location.origin;
  const iframe = `<iframe class="trial-signup-widget" src="${origin}/widget/trial" frameborder="0" scrolling="no" style="min-width:100%;width:100%;min-height:620px;border:0;overflow:hidden;" loading="lazy" title="Start trial"></iframe>`;
  if (!backend) return iframe;
  return `<script type="text/javascript" src="${backend}/embed/trial-widget.js"></script>
${iframe}`;
}
