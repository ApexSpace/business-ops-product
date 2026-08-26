/**
 * SMS A2P + two-way lifecycle (design reference — Phase 2/3 not implemented yet).
 *
 * Phase 1 (current):
 * - Auto-assign US local number on business register
 * - a2pPool = SHARED (PandaCue Brand + Campaign + Messaging Service)
 * - twoWayEnabled = false (notifications only)
 *
 * Phase 2 (design):
 * - Platform grants `sms` capability / SMS Chat add-on
 * - Business activates two-way in Integrations → flip twoWayEnabled on SAME number
 * - Prefer delaying full salon-branded chat until Phase 3 OWNED A2P
 *
 * Phase 3 (design):
 * - Trial / default → stay on SHARED pool
 * - Paid / converted → OWNED Brand+Campaign (typically new subaccount), move number off shared pool
 * - Also: add location number, marketing number, change number, port-in
 */
export const SMS_A2P_LIFECYCLE_PHASE = {
  SHARED_NOTIFICATIONS: 1,
  TWO_WAY_ON_SAME_NUMBER: 2,
  OWNED_BRAND_AND_NUMBER_LIFECYCLE: 3,
} as const;
