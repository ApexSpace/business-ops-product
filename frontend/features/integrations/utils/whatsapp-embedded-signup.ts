import {
  completeWhatsappEmbeddedSignup,
  getMetaClientConfig,
} from "@/features/integrations/api/integrations.api";
import { WHATSAPP_EMBEDDED_SIGNUP_NOT_CONFIGURED_MESSAGE } from "@/features/integrations/utils/integrations";

export interface MetaClientConfig {
  appId: string;
  graphApiVersion: string;
  whatsappEmbeddedSignupConfigId: string | null;
  whatsappEmbeddedSignupReady: boolean;
}

export type WhatsAppEmbeddedSignupOnboardingType = "business_app" | "cloud_api";

export interface WhatsAppEmbeddedSignupResult {
  code?: string;
  wabaId?: string;
  phoneNumberId?: string;
  displayPhoneNumber?: string;
  verifiedName?: string;
  onboardingType?: WhatsAppEmbeddedSignupOnboardingType;
}

const EMBEDDED_SIGNUP_FINISH_EVENTS = new Set([
  "FINISH",
  "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
]);

/** Business-app verification on the phone can take several minutes. */
const EMBEDDED_SIGNUP_MAX_WAIT_MS = 600_000;
/** Grace period for postMessage after FB.login returns a code. */
const EMBEDDED_SIGNUP_POST_LOGIN_GRACE_MS = 30_000;

type FacebookLoginResponse = {
  authResponse?: { code?: string,
};
  status?: string;
};

type WaEmbeddedSignupMessage = {
  type?: string;
  event?: string;
  data?: {
    phone_number_id?: string;
    waba_id?: string;
    waba_ids?: string[];
    current_step?: string;
  };
};

type EmbeddedSignupFinishData = Pick<
  WhatsAppEmbeddedSignupResult,
  "wabaId" | "phoneNumberId" | "onboardingType"
>;

declare global {
  interface Window {
    FB?: {
      init: (params: {
        appId: string;
        cookie?: boolean;
        xfbml?: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: FacebookLoginResponse) => void,
        options: Record<string, unknown>,
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

const FB_SDK_URL = "https://connect.facebook.net/en_US/sdk.js";
let sdkLoadPromise: Promise<void> | null = null;

export async function fetchMetaClientConfig(): Promise<MetaClientConfig> {
  return getMetaClientConfig();
}

function isMetaEmbeddedSignupOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname === "facebook.com" || hostname.endsWith(".facebook.com");
  } catch {
    return false;
  }
}

function parseFinishData(
  payload: WaEmbeddedSignupMessage,
): EmbeddedSignupFinishData | null {
  if (!EMBEDDED_SIGNUP_FINISH_EVENTS.has(payload.event ?? "")) {
    return null;
  }

  const wabaId =
    payload.data?.waba_id ?? payload.data?.waba_ids?.[0] ?? undefined;
  const phoneNumberId = payload.data?.phone_number_id;
  const isBusinessAppOnboarding =
    payload.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING";

  if (!wabaId && !phoneNumberId) {
    return null;
  }

  return {
    wabaId,
    phoneNumberId,
    onboardingType: isBusinessAppOnboarding ? "business_app" : "cloud_api",
  };
}

class EmbeddedSignupSession {
  private finishData: EmbeddedSignupFinishData | null = null;
  private finishResolvers: Array<(data: EmbeddedSignupFinishData) => void> = [];
  private disposed = false;

  private readonly onMessage = (event: MessageEvent) => {
    if (!isMetaEmbeddedSignupOrigin(event.origin)) {
      return;
    }

    let payload: WaEmbeddedSignupMessage;
    try {
      payload =
        typeof event.data === "string"
          ? (JSON.parse(event.data) as WaEmbeddedSignupMessage)
          : (event.data as WaEmbeddedSignupMessage);
    } catch {
      return;
    }

    if (payload.type !== "WA_EMBEDDED_SIGNUP") return;

    if (payload.event === "CANCEL") {
      this.dispose();
      return;
    }

    const parsed = parseFinishData(payload);
    if (!parsed) return;

    this.finishData = parsed;
    for (const resolve of this.finishResolvers) {
      resolve(parsed);
    }
    this.finishResolvers = [];
  };

  start(): void {
    window.addEventListener("message", this.onMessage);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    window.removeEventListener("message", this.onMessage);
    this.finishResolvers = [];
  }

  getFinishData(): EmbeddedSignupFinishData | null {
    return this.finishData;
  }

  waitForFinish(timeoutMs: number): Promise<EmbeddedSignupFinishData | null> {
    if (this.finishData) {
      return Promise.resolve(this.finishData);
    }

    return new Promise((resolve) => {
      const timer = window.setTimeout(() => {
        this.finishResolvers = this.finishResolvers.filter(
          (item) => item !== onResolved,
        );
        resolve(this.finishData);
      }, timeoutMs);

      const onResolved = (data: EmbeddedSignupFinishData) => {
        window.clearTimeout(timer);
        resolve(data);
      };

      this.finishResolvers.push(onResolved);
    });
  }
}

function loadFacebookSdk(appId: string, graphApiVersion: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Facebook SDK requires a browser"));
  }
  if (window.FB) return Promise.resolve();

  if (!sdkLoadPromise) {
    sdkLoadPromise = new Promise((resolve, reject) => {
      const existing = document.getElementById("facebook-jssdk");
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () =>
          reject(new Error("Failed to load Facebook SDK")),
        );
        return;
      }

      window.fbAsyncInit = () => {
        window.FB?.init({
          appId,
          cookie: true,
          xfbml: false,
          version: graphApiVersion,
        });
        resolve();
      };

      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.async = true;
      script.defer = true;
      script.src = FB_SDK_URL;
      script.onerror = () => reject(new Error("Failed to load Facebook SDK"));
      document.body.appendChild(script);
    });
  }

  return sdkLoadPromise;
}

function loginWithEmbeddedSignupConfig(
  configId: string,
  maxWaitMs: number,
): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    if (!window.FB) {
      reject(new Error("Facebook SDK is not initialized"));
      return;
    }

    if (window.location.protocol !== "https:") {
      reject(
        new Error(
          "WhatsApp Embedded Signup requires HTTPS. Open the app over https:// (for local dev, use a TLS proxy such as mkcert or ngrok) and try again.",
        ),
      );
      return;
    }

    const timer = window.setTimeout(() => {
      reject(
        new Error(
          "WhatsApp Embedded Signup timed out. Please try again.",
        ),
      );
    }, maxWaitMs);

    window.FB.login(
      (response) => {
        window.clearTimeout(timer);

        if (response.authResponse?.code) {
          resolve(response.authResponse.code);
          return;
        }
        if (response.status === "unknown") {
          reject(
            new Error(
              "WhatsApp Embedded Signup did not complete. Please try again.",
            ),
          );
          return;
        }
        resolve(undefined);
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: "whatsapp_business_app_onboarding",
          sessionInfoVersion: "3",
        },
      },
    );
  });
}

export async function launchWhatsAppEmbeddedSignup(
  clientConfig?: MetaClientConfig,
): Promise<WhatsAppEmbeddedSignupResult> {
  const config = clientConfig ?? (await fetchMetaClientConfig());

  if (!config.whatsappEmbeddedSignupReady || !config.whatsappEmbeddedSignupConfigId) {
    throw new Error(WHATSAPP_EMBEDDED_SIGNUP_NOT_CONFIGURED_MESSAGE);
  }

  await loadFacebookSdk(config.appId, config.graphApiVersion);

  const session = new EmbeddedSignupSession();
  session.start();

  try {
    const code = await loginWithEmbeddedSignupConfig(
      config.whatsappEmbeddedSignupConfigId,
      EMBEDDED_SIGNUP_MAX_WAIT_MS,
    );

    const finishData =
      (await session.waitForFinish(EMBEDDED_SIGNUP_POST_LOGIN_GRACE_MS)) ??
      session.getFinishData();

    return {
      code,
      wabaId: finishData?.wabaId,
      phoneNumberId: finishData?.phoneNumberId,
      onboardingType: finishData?.onboardingType ?? "business_app",
    };
  } finally {
    session.dispose();
  }
}

export async function completeWhatsAppEmbeddedSignupOnServer(
  payload: WhatsAppEmbeddedSignupResult,
): Promise<void> {
  await completeWhatsappEmbeddedSignup({
    code: payload.code,
    wabaId: payload.wabaId,
    phoneNumberId: payload.phoneNumberId,
    displayPhoneNumber: payload.displayPhoneNumber,
    verifiedName: payload.verifiedName,
    onboardingType: payload.onboardingType,
  });
}

export async function completePlatformWhatsAppEmbeddedSignupOnServer(
  payload: WhatsAppEmbeddedSignupResult,
): Promise<void> {
  const { completePlatformWhatsappEmbeddedSignup } = await import(
    "@/features/integrations/api/integrations.api"
  );
  await completePlatformWhatsappEmbeddedSignup({
    code: payload.code,
    wabaId: payload.wabaId,
    phoneNumberId: payload.phoneNumberId,
    displayPhoneNumber: payload.displayPhoneNumber,
    verifiedName: payload.verifiedName,
    onboardingType: payload.onboardingType,
  });
}
