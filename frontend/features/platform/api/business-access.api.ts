import { api } from "@/lib/api/client";
import type {
  BusinessAccess,
  BusinessCapabilityAssignment,
  UpdateBusinessAccessInput,
} from "@/features/platform/types/business-access";
import type {
  ChangePackageActionInput,
  ChangeSnapshotActionInput,
  CursorPaginatedResult,
  ListSubscriptionEventsQuery,
  ListSubscriptionPaymentsQuery,
  MarkPaidInput,
  PreviewActionInput,
  PreviewActionResult,
  ReactivateBusinessInput,
  RecordPaymentInput,
  RefundPaymentInput,
  BusinessSubscriptionEventDetail,
  BusinessSubscriptionEventListItem,
  BusinessSubscriptionPayment,
  VoidPaymentInput,
} from "@/features/platform/types/business-subscription";

export function getPlatformBusinessAccess(businessId: string) {
  return api.get<BusinessAccess>(`platform/businesses/${businessId}/access`);
}

export function previewPlatformBusinessAccessAction(
  businessId: string,
  body: PreviewActionInput,
) {
  return api.post<PreviewActionResult>(
    `platform/businesses/${businessId}/access/preview-action`,
    body,
  );
}

export type ManualAccessUpdateBody = {
  reason: string;
  notes: string;
  fields?: Record<string, unknown>;
};

export function updatePlatformBusinessAccess(
  businessId: string,
  body: UpdateBusinessAccessInput | ManualAccessUpdateBody,
) {
  return api.patch<BusinessAccess>(
    `platform/businesses/${businessId}/access`,
    body,
  );
}

export function syncPlatformBusinessCapabilitiesFromTier(
  businessId: string,
  body?: { reason?: string; notes?: string },
) {
  return api.post<BusinessAccess>(
    `platform/businesses/${businessId}/sync-capabilities-from-tier`,
    body,
  );
}

export function markPlatformBusinessPaid(
  businessId: string,
  body?: MarkPaidInput,
) {
  return api.post<BusinessAccess>(
    `platform/businesses/${businessId}/access/mark-paid`,
    body,
  );
}

export function recordPlatformBusinessPayment(
  businessId: string,
  body: RecordPaymentInput,
) {
  return api.post<BusinessAccess>(
    `platform/businesses/${businessId}/access/record-payment`,
    body,
  );
}

export function extendPlatformBusinessTrial(
  businessId: string,
  body: { currentPeriodEnd?: string; days?: number; reason?: string; notes?: string },
) {
  return api.post<BusinessAccess>(
    `platform/businesses/${businessId}/access/extend-trial`,
    body,
  );
}

export function movePlatformBusinessToPendingPayment(
  businessId: string,
  body?: { reason?: string; notes?: string },
) {
  return api.post<BusinessAccess>(
    `platform/businesses/${businessId}/access/move-to-pending-payment`,
    body,
  );
}

export function suspendPlatformBusiness(
  businessId: string,
  body?: { reason?: string; notes?: string },
) {
  return api.post<BusinessAccess>(
    `platform/businesses/${businessId}/access/suspend`,
    body,
  );
}

export function reactivatePlatformBusiness(
  businessId: string,
  body?: ReactivateBusinessInput,
) {
  return api.post<BusinessAccess>(
    `platform/businesses/${businessId}/access/reactivate`,
    body,
  );
}

export function cancelPlatformBusinessSubscription(
  businessId: string,
  body?: { reason?: string; notes?: string },
) {
  return api.post<BusinessAccess>(
    `platform/businesses/${businessId}/access/cancel-subscription`,
    body,
  );
}

export function expirePlatformBusinessTrial(
  businessId: string,
  body?: { reason?: string; notes?: string },
) {
  return api.post<BusinessAccess>(
    `platform/businesses/${businessId}/access/expire-trial`,
    body,
  );
}

export function changePlatformBusinessPackage(
  businessId: string,
  body: ChangePackageActionInput,
) {
  return api.post<BusinessAccess>(
    `platform/businesses/${businessId}/access/change-package`,
    body,
  );
}

export function changePlatformBusinessSnapshot(
  businessId: string,
  body: ChangeSnapshotActionInput,
) {
  return api.post<BusinessAccess>(
    `platform/businesses/${businessId}/access/change-snapshot`,
    body,
  );
}

export function listPlatformBusinessSubscriptionEvents(
  businessId: string,
  query?: ListSubscriptionEventsQuery,
) {
  return api.get<CursorPaginatedResult<BusinessSubscriptionEventListItem>>(
    `platform/businesses/${businessId}/subscription-events`,
    {
      searchParams: query as Record<
        string,
        string | number | boolean | undefined | null
      >,
    },
  );
}

export function getPlatformBusinessSubscriptionEvent(
  businessId: string,
  eventId: string,
) {
  return api.get<BusinessSubscriptionEventDetail>(
    `platform/businesses/${businessId}/subscription-events/${eventId}`,
  );
}

export function listPlatformBusinessSubscriptionPayments(
  businessId: string,
  query?: ListSubscriptionPaymentsQuery,
) {
  return api.get<CursorPaginatedResult<BusinessSubscriptionPayment>>(
    `platform/businesses/${businessId}/subscription-payments`,
    {
      searchParams: query as Record<
        string,
        string | number | boolean | undefined | null
      >,
    },
  );
}

export function createPlatformBusinessSubscriptionPayment(
  businessId: string,
  body: RecordPaymentInput,
) {
  return api.post<BusinessSubscriptionPayment>(
    `platform/businesses/${businessId}/subscription-payments`,
    body,
  );
}

export function updatePlatformBusinessSubscriptionPayment(
  businessId: string,
  paymentId: string,
  body: Partial<RecordPaymentInput>,
) {
  return api.patch<BusinessSubscriptionPayment>(
    `platform/businesses/${businessId}/subscription-payments/${paymentId}`,
    body,
  );
}

export function voidPlatformBusinessSubscriptionPayment(
  businessId: string,
  paymentId: string,
  body: VoidPaymentInput,
) {
  return api.post<BusinessSubscriptionPayment>(
    `platform/businesses/${businessId}/subscription-payments/${paymentId}/void`,
    body,
  );
}

export function refundPlatformBusinessSubscriptionPayment(
  businessId: string,
  paymentId: string,
  body: RefundPaymentInput,
) {
  return api.post<BusinessSubscriptionPayment>(
    `platform/businesses/${businessId}/subscription-payments/${paymentId}/refund`,
    body,
  );
}

export function listPlatformBusinessCapabilities(businessId: string) {
  return api.get<BusinessCapabilityAssignment[]>(
    `platform/businesses/${businessId}/capabilities`,
  );
}

export function updatePlatformBusinessCapabilities(
  businessId: string,
  body: {
    capabilities: Array<{
      capabilityId: string;
      status?: "ACTIVE" | "DISABLED";
      source?: "PLAN_TIER" | "CUSTOM" | "MANUAL";
    }>;
  },
) {
  return api.patch<BusinessCapabilityAssignment[]>(
    `platform/businesses/${businessId}/capabilities`,
    body,
  );
}
