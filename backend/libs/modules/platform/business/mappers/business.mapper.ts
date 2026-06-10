import {
  Business,
  Industry,
  Snapshot,
  BusinessSubscription,
  PlanTier,
  PlanGroup,
} from '@prisma/client';
import { toIndustryOption } from '@app/modules/crm/industries/mappers/industry.mapper';
import { BusinessResponseDto } from '../dto/business-response.dto';
import { BusinessAccessResolution } from '../types/business-access-resolution.types';
import { extractFinancialSettings } from '../utils/financial-settings.util';

type BusinessWithIndustry = Business & {
  industry?: Industry | null;
  snapshot?: Pick<Snapshot, 'id' | 'name' | 'status'> | null;
  subscription?:
    | (BusinessSubscription & {
        planTier?: Pick<PlanTier, 'name'> | null;
        planGroup?: Pick<PlanGroup, 'name'> | null;
      })
    | null;
};

export function toBusinessResponse(
  business: BusinessWithIndustry,
  resolution?: BusinessAccessResolution,
  extras?: {
    latestPaymentAt?: Date | null;
    recommendedActionKey?: string | null;
  },
): BusinessResponseDto {
  const financial = extractFinancialSettings(business);

  return {
    id: business.id,
    name: business.name,
    industryId: business.industryId,
    industry: business.industry ? toIndustryOption(business.industry) : null,
    snapshotId: business.snapshotId,
    snapshotName: business.snapshot?.name ?? null,
    snapshotStatus: business.snapshot?.status ?? null,
    snapshotAppliedAt: business.snapshotAppliedAt,
    status: business.status,
    firstName: business.firstName,
    lastName: business.lastName,
    displayName: business.displayName,
    email: business.email,
    phoneCountryCode: business.phoneCountryCode,
    phoneNumber: business.phoneNumber,
    address: business.address,
    city: business.city,
    state: business.state,
    country: business.country,
    zip: business.zip,
    website: business.website,
    timezone: business.timezone,
    logoUrl: financial.businessInformation.logoUrl || null,
    addressLine2: financial.businessInformation.addressLine2 || null,
    taxesAndCurrency: financial.taxesAndCurrency,
    settings: business.settings as Record<string, unknown> | null,
    createdById: business.createdById,
    createdAt: business.createdAt,
    updatedAt: business.updatedAt,
    subscriptionStatus: business.subscription?.status ?? null,
    planTierName: business.subscription?.planTier?.name ?? null,
    planGroupName: business.subscription?.planGroup?.name ?? null,
    planTierId: business.subscription?.planTierId ?? null,
    paymentMethod: business.subscription?.paymentMethod ?? null,
    paymentStatus: business.subscription?.paymentStatus ?? null,
    latestPaymentAt: extras?.latestPaymentAt ?? null,
    recommendedActionKey: extras?.recommendedActionKey ?? null,
    currentPeriodEnd: business.subscription?.currentPeriodEnd ?? null,
    canAccessWorkspace: resolution?.canAccessWorkspace ?? false,
    reasonCode: resolution?.reasonCode ?? 'BUSINESS_NOT_ACTIVE',
    reasonLabel: resolution?.reasonLabel ?? 'Workspace is not active yet.',
    needsAttention: resolution?.needsAttention ?? [],
  };
}
