import { api } from "@/lib/api/client";
import { getJobIdFromMeta, pollAsyncJob } from "@/lib/api/async-job";
import type {
  BusinessIntegration,
  IntegrationProviderWithStatus,
} from "@/features/integrations/utils/integrations";

import type { IntegrationResourcesListResponse } from "@/features/integrations/utils/integration-resources";
export type { IntegrationResourcesListResponse };

export async function syncIntegrationResources(providerKey: string) {
  const { data, meta } = await api.postWithMeta<{
    jobId: string;
    status: string;
  }>(`integrations/business/${providerKey}/resources/sync`);

  const jobId = getJobIdFromMeta(meta) ?? data?.jobId;
  if (!jobId) {
    throw new Error("Sync started but no job id returned");
  }

  const job = await pollAsyncJob(jobId);
  const result = job.result as { resourceCount?: number } | null;
  return { job, resourceCount: result?.resourceCount ?? 0 };
}

export function listIntegrationResources(providerKey: string) {
  return api.get<IntegrationResourcesListResponse>(
    `integrations/business/${providerKey}/resources`,
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

export function selectIntegrationResource(providerKey: string, resourceId: string) {
  return api.post<void>(
    `integrations/business/${providerKey}/resources/${resourceId}/select`,
  );
}

export function unselectIntegrationResource(
  providerKey: string,
  resourceId: string,
) {
  return api.post<void>(
    `integrations/business/${providerKey}/resources/${resourceId}/unselect`,
  );
}

export function makeDefaultIntegrationResource(
  providerKey: string,
  resourceId: string,
) {
  return api.post<void>(
    `integrations/business/${providerKey}/resources/${resourceId}/make-default`,
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

export type OpsMessagingChannel = {
  providerKey: string;
  integration: BusinessIntegration | null;
  messagingStatus: {
    connected: boolean;
    defaultResourceSelected: boolean;
    webhookEndpointConfigured: boolean;
    requiredPermissionsPresent: boolean;
    readyForMessaging: boolean;
    warnings: string[];
  };
};

export function listOpsMessagingChannels() {
  return api.get<{ businessId: string; channels: OpsMessagingChannel[] }>(
    "platform/integrations/messaging",
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

export function getPlatformDefaultEmail() {
  return api.get<PlatformDefaultEmail | null>(
    "integrations/business/email/platform-default",
  );
}

export function connectPlatformDefaultEmail() {
  return api.post<PlatformDefaultEmail>(
    "integrations/business/email/connect-platform-default",
  );
}

export type PlatformDefaultSms = {
  integrationId: string;
  resourceId: string;
  fromNumber: string;
  mode: "platform";
  a2pPool?: "SHARED" | "OWNED";
  provisioned?: boolean;
};

export function getPlatformDefaultSms() {
  return api.get<PlatformDefaultSms | null>(
    "integrations/business/sms/platform-default",
  );
}

export function connectPlatformDefaultSms() {
  return api.post<PlatformDefaultSms>(
    "integrations/business/sms/connect-platform-default",
  );
}

export function listTwilioPhoneNumbers(body: {
  accountSid: string;
  authToken: string;
}) {
  return api.post<
    Array<{ sid: string; phoneNumber: string; friendlyName: string }>
  >("integrations/business/sms/list-phone-numbers", body);
}

export function connectBusinessTwilio(body: {
  accountSid: string;
  authToken: string;
  phoneNumberSid: string;
}) {
  return api.post<{
    integrationId: string;
    resourceId: string;
    fromNumber: string;
    mode: "business";
  }>("integrations/business/sms/connect-twilio", body);
}

export function getSmsWebhookUrls() {
  return api.get<{
    inboundUrl: string | null;
    statusCallbackUrl: string | null;
  }>("integrations/business/sms/webhook-url");
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
