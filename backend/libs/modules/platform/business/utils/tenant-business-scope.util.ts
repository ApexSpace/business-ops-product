import {
  BusinessLifecycleStage,
  BusinessType,
  Prisma,
} from '@prisma/client';

export const INTERNAL_OPS_BUSINESS_ID =
  '00000000-0000-4000-8000-000000000001' as const;

/**
 * All TENANT workspaces including incomplete funnel rows (LEAD/TRIAL/…).
 * Prefer customerBusinessWhere for customer meaning; keep for intentional all-tenant scans.
 */
export function tenantBusinessWhere(
  extra: Prisma.BusinessWhereInput = {},
): Prisma.BusinessWhereInput {
  return {
    type: BusinessType.TENANT,
    ...extra,
  };
}

/** Paying / day-to-day customers — default for counts, directory, billing, generic reports. */
export function customerBusinessWhere(
  extra: Prisma.BusinessWhereInput = {},
): Prisma.BusinessWhereInput {
  return {
    type: BusinessType.TENANT,
    lifecycleStage: BusinessLifecycleStage.ACTIVE,
    ...extra,
  };
}

/** Opt-in: trial tenants only (analytics / trial reports). */
export function trialBusinessWhere(
  extra: Prisma.BusinessWhereInput = {},
): Prisma.BusinessWhereInput {
  return {
    type: BusinessType.TENANT,
    lifecycleStage: BusinessLifecycleStage.TRIAL,
    ...extra,
  };
}

/** Opt-in: funnel analytics for selected lifecycle stages. */
export function funnelBusinessWhere(
  stages: BusinessLifecycleStage[],
  extra: Prisma.BusinessWhereInput = {},
): Prisma.BusinessWhereInput {
  return {
    type: BusinessType.TENANT,
    lifecycleStage: { in: stages },
    ...extra,
  };
}

/**
 * Relation filter for subscription / billing jobs that must not touch ops or incomplete leads.
 * ACTIVE customers only.
 */
export function customerBusinessRelationWhere(): Prisma.BusinessWhereInput {
  return {
    type: BusinessType.TENANT,
    lifecycleStage: BusinessLifecycleStage.ACTIVE,
  };
}

/**
 * @deprecated Prefer customerBusinessRelationWhere for billing.
 * Kept as TENANT-only for rare intentional all-tenant relation filters.
 */
export function tenantBusinessRelationWhere(): Prisma.BusinessWhereInput {
  return { type: BusinessType.TENANT };
}
