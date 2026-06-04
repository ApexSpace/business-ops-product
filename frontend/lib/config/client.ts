export type ClientPlatform = "web" | "android" | "ios";

const PLATFORM =
  (process.env.NEXT_PUBLIC_CLIENT_PLATFORM as ClientPlatform | undefined) ??
  "web";

const VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0";

export function getClientPlatform(): ClientPlatform {
  return PLATFORM;
}

export function getClientVersion(): string {
  return VERSION;
}
