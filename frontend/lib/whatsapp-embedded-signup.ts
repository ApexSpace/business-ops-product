import { apiClient } from "@/lib/api-client";
import { WHATSAPP_EMBEDDED_SIGNUP_NOT_CONFIGURED_MESSAGE } from "@/lib/integrations";

export interface MetaClientConfig {
  appId: string;
  graphApiVersion: string;
  whatsappEmbeddedSignupConfigId: string | null;
  whatsappEmbeddedSignupReady: boolean;
}

export interface WhatsAppEmbeddedSignupResult {
  code?: string;
  wabaId?: string;
  phoneNumberId?: string;
  displayPhoneNumber?: string;
  verifiedName?: string;
}

type FacebookLoginResponse = {
  authResponse?: { code?: string };
  status?: string;
};

type WaEmbeddedSignupMessage = {
  type?: string;
  event?: string;
  data?: {
    phone_number_id?: string;
    waba_id?: string;
    current_step?: string;
  };
};

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
  return apiClient<MetaClientConfig>("integrations/oauth/meta/client-config");
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

function listenForEmbeddedSignupFinish(
  timeoutMs: number,
): Promise<Pick<WhatsAppEmbeddedSignupResult, "wabaId" | "phoneNumberId">> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      reject(new Error("WhatsApp Embedded Signup timed out. Please try again."));
    }, timeoutMs);

    const onMessage = (event: MessageEvent) => {
      if (
        event.origin !== "https://www.facebook.com" &&
        event.origin !== "https://web.facebook.com"
      ) {
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
        window.clearTimeout(timer);
        window.removeEventListener("message", onMessage);
        reject(new Error("WhatsApp Embedded Signup was cancelled."));
        return;
      }

      if (payload.event === "ERROR") {
        window.clearTimeout(timer);
        window.removeEventListener("message", onMessage);
        reject(new Error("WhatsApp Embedded Signup failed. Please try again."));
        return;
      }

      if (payload.event === "FINISH" && payload.data?.phone_number_id) {
        window.clearTimeout(timer);
        window.removeEventListener("message", onMessage);
        resolve({
          phoneNumberId: payload.data.phone_number_id,
          wabaId: payload.data.waba_id,
        });
      }
    };

    window.addEventListener("message", onMessage);
  });
}

function loginWithEmbeddedSignupConfig(
  configId: string,
): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    if (!window.FB) {
      reject(new Error("Facebook SDK is not initialized"));
      return;
    }

    window.FB.login(
      (response) => {
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
          feature: "whatsapp_embedded_signup",
          sessionInfoVersion: 2,
        },
      },
    );
  });
}

export async function launchWhatsAppEmbeddedSignup(): Promise<WhatsAppEmbeddedSignupResult> {
  const config = await fetchMetaClientConfig();

  if (!config.whatsappEmbeddedSignupReady || !config.whatsappEmbeddedSignupConfigId) {
    throw new Error(WHATSAPP_EMBEDDED_SIGNUP_NOT_CONFIGURED_MESSAGE);
  }

  await loadFacebookSdk(config.appId, config.graphApiVersion);

  const finishPromise = listenForEmbeddedSignupFinish(120_000);
  const code = await loginWithEmbeddedSignupConfig(
    config.whatsappEmbeddedSignupConfigId,
  );
  const finishData = await finishPromise;

  return {
    code,
    ...finishData,
  };
}

export async function completeWhatsAppEmbeddedSignupOnServer(
  payload: WhatsAppEmbeddedSignupResult,
): Promise<void> {
  await apiClient("integrations/business/whatsapp/embedded-signup/complete", {
    method: "POST",
    body: {
      code: payload.code,
      wabaId: payload.wabaId,
      phoneNumberId: payload.phoneNumberId,
      displayPhoneNumber: payload.displayPhoneNumber,
      verifiedName: payload.verifiedName,
    },
  });
}
