import { api } from "@/lib/api/client";
import { getJobIdFromMeta, pollAsyncJob } from "@/lib/api/async-job";
import type {
  BusinessIntegration,
  IntegrationProviderWithStatus,
} from "@/features/integrations/utils/integrations";

import type { IntegrationResourcesListResponse } from "@/features/integrations/utils/integration-resources";
export type { IntegrationResourcesListResponse };

export type IntegrationsHostMode = "business" | "platform";

function resourcesApiBase(host: IntegrationsHostMode, providerKey: string) {
  return host === "platform"
    ? `platform/integrations/ops/${providerKey}/resources`
    : `integrations/business/${providerKey}/resources`;
}

export async function syncIntegrationResources(
  providerKey: string,
  host: IntegrationsHostMode = "business",
) {
  const { data, meta } = await api.postWithMeta<{
    jobId: string;
    status: string;
  }>(`${resourcesApiBase(host, providerKey)}/sync`);

  const jobId = getJobIdFromMeta(meta) ?? data?.jobId;
  if (!jobId) {
    throw new Error("Sync started but no job id returned");
  }

  const job = await pollAsyncJob(jobId);
  const result = job.result as { resourceCount?: number } | null;
  return { job, resourceCount: result?.resourceCount ?? 0,
};
}

export function listIntegrationResources(
  providerKey: string,
  host: IntegrationsHostMode = "business",
) {
  return api.get<IntegrationResourcesListResponse>(
    resourcesApiBase(host, providerKey),
  );
}

export function connectBusinessIntegration(
  providerKey: string,
  body?: Record<string, unknown>,
) {
  return api.post<void>(
    `integrations/business/${providerKey}/connect`,
    body ?? {},
  );
}

export function updateBusinessIntegration(
  providerKey: string,
  body: Record<string, unknown>,
) {
  return api.patch<void>(`integrations/business/${providerKey}`, body);
}

export function disconnectBusinessIntegration(providerKey: string) {
  return api.delete<void>(`integrations/business/${providerKey}`);
}

export function confirmDisconnectBusinessIntegration(providerKey: string) {
  return api.delete<void>(
    `integrations/business/${providerKey}?confirm=true`,
  );
}

export function selectIntegrationResource(
  providerKey: string,
  resourceId: string,
  host: IntegrationsHostMode = "business",
) {
  return api.post<void>(
    `${resourcesApiBase(host, providerKey)}/${resourceId}/select`,
  );
}

export function unselectIntegrationResource(
  providerKey: string,
  resourceId: string,
  host: IntegrationsHostMode = "business",
) {
  return api.post<void>(
    `${resourcesApiBase(host, providerKey)}/${resourceId}/unselect`,
  );
}

export function makeDefaultIntegrationResource(
  providerKey: string,
  resourceId: string,
  host: IntegrationsHostMode = "business",
) {
  return api.post<void>(
    `${resourcesApiBase(host, providerKey)}/${resourceId}/make-default`,
  );
}

export function selectIntegrationResourceWithBody(
  providerKey: string,
  resourceId: string,
  body: Record<string, unknown>,
) {
  return api.patch<void>(
    `integrations/business/${providerKey}/resources/${resourceId}/select`,
    body,
  );
}

export function setDefaultIntegrationResource(
  providerKey: string,
  resourceId: string,
) {
  return api.post<void>(
    `integrations/business/${providerKey}/resources/${resourceId}/default`,
  );
}

export function clearDefaultIntegrationResource(
  providerKey: string,
  resourceId: string,
) {
  return api.delete<void>(
    `integrations/business/${providerKey}/resources/${resourceId}/default`,
  );
}

export function connectPlatformIntegration(
  providerKey: string,
  body?: Record<string, unknown>,
) {
  return api.post<void>(
    `platform/integrations/${providerKey}/connect`,
    body ?? {},
  );
}

export function updatePlatformIntegration(
  providerKey: string,
  body: Record<string, unknown>,
) {
  return api.patch<void>(`platform/integrations/${providerKey}`, body);
}

export function disconnectPlatformIntegration(providerKey: string) {
  return api.delete<void>(`platform/integrations/${providerKey}`);
}

export function confirmDisconnectPlatformIntegration(providerKey: string) {
  return api.delete<void>(
    `platform/integrations/${providerKey}?confirm=true`,
  );
}

export function completeWhatsappEmbeddedSignup(body: Record<string, unknown>) {
  return api.post<void>(
    "integrations/business/whatsapp/embedded-signup/complete",
    body,
  );
}

export function completePlatformWhatsappEmbeddedSignup(
  body: Record<string, unknown>,
) {
  return api.post<{ success: true }>(
    "platform/integrations/oauth/meta/whatsapp/embedded-signup/complete",
    body,
  );
}

export type MetaClientConfig = {
  appId: string;
  graphApiVersion: string;
  whatsappEmbeddedSignupConfigId: string | null;
  whatsappEmbeddedSignupReady: boolean;
};

export function getMetaClientConfig() {
  return api.get<MetaClientConfig>("integrations/oauth/meta/client-config");
}

export function getPlatformMetaClientConfig() {
  return api.get<MetaClientConfig>(
    "platform/integrations/oauth/meta/client-config",
  );
}

export function connectOpsSms() {
  return api.post<PlatformDefaultSms>(
    "platform/integrations/messaging/sms/connect",
  );
}

export function connectOpsEmail() {
  return api.post<PlatformDefaultEmail>(
    "platform/integrations/messaging/email/connect",
  );
}

export type PlatformDefaultEmail = {
  integrationId: string;
  resourceId: string;
  fromName: string;
  fromAddress: string;
  slug: string;
  sendingDomain: string;
};

export type PlatformDefaultSms = {
  integrationId: string;
  resourceId: string;
  fromNumber: string;
  mode: "platform";
  a2pPool?: "SHARED" | "OWNED";
  provisioned?: boolean;
};

function smsApiBase(host: IntegrationsHostMode) {
  return host === "platform"
    ? "platform/integrations/messaging/sms"
    : "integrations/business/sms";
}

function emailApiBase(host: IntegrationsHostMode) {
  return host === "platform"
    ? "platform/integrations/messaging/email"
    : "integrations/business/email";
}

export function getPlatformDefaultEmail(
  host: IntegrationsHostMode = "business",
) {
  return api.get<PlatformDefaultEmail | null>(
    `${emailApiBase(host)}/platform-default`,
  );
}

export function connectPlatformDefaultEmail() {
  return api.post<PlatformDefaultEmail>(
    "integrations/business/email/connect-platform-default",
  );
}

export function getPlatformDefaultSms(host: IntegrationsHostMode = "business") {
  return api.get<PlatformDefaultSms | null>(
    `${smsApiBase(host)}/platform-default`,
  );
}

export function connectPlatformDefaultSms(
  host: IntegrationsHostMode = "business",
) {
  return api.post<PlatformDefaultSms>(
    `${smsApiBase(host)}/connect-platform-default`,
  );
}

export function listTwilioPhoneNumbers(
  body: {
    accountSid: string;
    authToken: string;
  },
  host: IntegrationsHostMode = "business",
) {
  return api.post<
    Array<{ sid: string; phoneNumber: string; friendlyName: string }>
  >(`${smsApiBase(host)}/list-phone-numbers`, body);
}

export function connectBusinessTwilio(
  body: {
    accountSid: string;
    authToken: string;
    phoneNumberSid: string;
  },
  host: IntegrationsHostMode = "business",
) {
  return api.post<{
    integrationId: string;
    resourceId: string;
    fromNumber: string;
    mode: "business";
  }>(`${smsApiBase(host)}/connect-twilio`, body);
}

export function getSmsWebhookUrls(host: IntegrationsHostMode = "business") {
  return api.get<{
    inboundUrl: string | null;
    statusCallbackUrl: string | null;
  }>(`${smsApiBase(host)}/webhook-url`);
}

export function listBusinessIntegrationProviders() {
  return api.get<IntegrationProviderWithStatus[]>("integrations/providers");
}

export function getBusinessIntegration(providerKey: string) {
  return api.get<BusinessIntegration>(
    `integrations/business/${providerKey}`,
  );
}

export function listPlatformIntegrationProviders() {
  return api.get<IntegrationProviderWithStatus[]>(
    "platform/integrations/providers",
  );
}

/** Same catalog as business integrations, for INTERNAL ops + platform-only. */
export function listOpsWorkspaceProviders() {
  return api.get<IntegrationProviderWithStatus[]>(
    "platform/integrations/providers",
  );
}

export function getOpsWorkspaceIntegration(providerKey: string) {
  return api.get<BusinessIntegration>(
    `platform/integrations/ops/${providerKey}`,
  );
}

export function confirmDisconnectOpsWorkspaceIntegration(providerKey: string) {
  return api.delete<void>(
    `platform/integrations/ops/${providerKey}?confirm=true`,
  );
}
