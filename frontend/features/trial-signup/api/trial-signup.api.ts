import { getPublicBackendUrl } from "@/lib/config/public-backend-url";
import type { TrialWizardState } from "../constants";

type Envelope<T> = {
  data?: T;
  message?: string;
  error?: { message?: string } | null;
};

function trialApiBase(): string {
  const base = getPublicBackendUrl();
  if (!base) {
    throw new Error(
      "NEXT_PUBLIC_BACKEND_URL is not configured for trial signup",
    );
  }
  return base;
}

async function postJson<T>(
  path: string,
  body: unknown,
): Promise<T> {
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
  }>("/public/trial/session", {
    sessionId: input.sessionId || undefined,
    payload: input.payload,
  });
}

export function sendTrialOtp(input: {
  phoneE164: string;
  sessionId?: string | null;
}) {
  return postJson<{ sent: boolean }>("/public/trial/phone/send-otp", {
    phoneE164: input.phoneE164,
    sessionId: input.sessionId || undefined,
  });
}

export function verifyTrialOtp(input: { phoneE164: string; code: string }) {
  return postJson<{ phoneVerificationToken: string }>(
    "/public/trial/phone/verify-otp",
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
    "/public/trial/complete",
    {
      ...input,
      sessionId: input.sessionId || undefined,
      website: input.website || undefined,
    },
  );
}

export function fetchTrialEmbedSnippet() {
  return getJson<{ scriptEmbed: string; iframeSrc: string }>(
    "/public/trial/embed",
  );
}

export function getTrialEmbedCodeFallback(): string | null {
  const backend = getPublicBackendUrl();
  if (!backend || typeof window === "undefined") return null;
  const origin = window.location.origin;
  return `<script type="text/javascript" src="${backend}/embed/trial-widget.js"></script>
<iframe class="trial-signup-widget" src="${origin}/widget/trial" frameborder="0" scrolling="no" style="min-width:100%;width:100%;border:0;" loading="lazy" title="Start trial"></iframe>`;
}
