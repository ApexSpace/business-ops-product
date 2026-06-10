import {
  cancelPlatformBusinessSubscription,
  changePlatformBusinessPackage,
  changePlatformBusinessSnapshot,
  expirePlatformBusinessTrial,
  extendPlatformBusinessTrial,
  markPlatformBusinessPaid,
  movePlatformBusinessToPendingPayment,
  reactivatePlatformBusiness,
  recordPlatformBusinessPayment,
  suspendPlatformBusiness,
  syncPlatformBusinessCapabilitiesFromTier,
  updatePlatformBusinessAccess,
} from "@/features/platform/api/business-access.api";
import type { BusinessAccess } from "@/features/platform/types/business-access";
import type {
  ChangePackageActionInput,
  ChangeSnapshotActionInput,
  ManualAccessUpdateInput,
  MarkPaidInput,
  ReactivateBusinessInput,
  RecordPaymentInput,
  SubscriptionActionKey,
} from "@/features/platform/types/business-subscription";

export type SubscriptionActionPayload = {
  markPaid?: MarkPaidInput;
  recordPayment?: RecordPaymentInput;
  extendTrial?: { currentPeriodEnd?: string; days?: number; reason?: string; notes?: string };
  changePackage?: ChangePackageActionInput;
  changeSnapshot?: ChangeSnapshotActionInput;
  reactivate?: ReactivateBusinessInput;
  manualUpdate?: ManualAccessUpdateInput;
  reason?: string;
  notes?: string;
};

export async function executeSubscriptionAction(
  businessId: string,
  actionKey: SubscriptionActionKey,
  payload?: SubscriptionActionPayload,
): Promise<BusinessAccess> {
  const reason = payload?.reason;
  const notes = payload?.notes;

  switch (actionKey) {
    case "MARK_PAID":
      return markPlatformBusinessPaid(businessId, payload?.markPaid);
    case "RECORD_PAYMENT":
      if (!payload?.recordPayment) {
        throw new Error("Payment details required");
      }
      return recordPlatformBusinessPayment(businessId, payload.recordPayment);
    case "MOVE_PENDING":
      return movePlatformBusinessToPendingPayment(businessId, { reason, notes });
    case "EXTEND_TRIAL":
      return extendPlatformBusinessTrial(businessId, {
        ...payload?.extendTrial,
        reason,
        notes,
      });
    case "CANCEL_SUBSCRIPTION":
      return cancelPlatformBusinessSubscription(businessId, { reason, notes });
    case "EXPIRE_TRIAL":
      return expirePlatformBusinessTrial(businessId, { reason, notes });
    case "SUSPEND_BUSINESS":
      return suspendPlatformBusiness(businessId, { reason, notes });
    case "REACTIVATE_BUSINESS":
      return reactivatePlatformBusiness(businessId, payload?.reactivate);
    case "CHANGE_PACKAGE":
      if (!payload?.changePackage) {
        throw new Error("Package change details required");
      }
      return changePlatformBusinessPackage(businessId, payload.changePackage);
    case "CHANGE_SNAPSHOT":
      if (!payload?.changeSnapshot) {
        throw new Error("Snapshot change details required");
      }
      return changePlatformBusinessSnapshot(businessId, payload.changeSnapshot);
    case "SYNC_CAPABILITIES":
      return syncPlatformBusinessCapabilitiesFromTier(businessId, { reason, notes });
    case "MANUAL_ADJUSTMENT": {
      if (!payload?.manualUpdate) {
        throw new Error("Manual update details required");
      }
      const { reason, adminNotes, ...fields } = payload.manualUpdate;
      return updatePlatformBusinessAccess(businessId, {
        reason,
        notes: adminNotes,
        fields,
      });
    }
    default:
      throw new Error(`Unknown action: ${actionKey}`);
  }
}
