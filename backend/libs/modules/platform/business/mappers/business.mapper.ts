import { Business, Industry } from '@prisma/client';
import { toIndustryOption } from '@app/modules/crm/industries/mappers/industry.mapper';
import { BusinessResponseDto } from '../dto/business-response.dto';
import { extractFinancialSettings } from '../utils/financial-settings.util';

type BusinessWithIndustry = Business & { industry?: Industry | null };

export function toBusinessResponse(
  business: BusinessWithIndustry,
): BusinessResponseDto {
  const financial = extractFinancialSettings(business);

  return {
    id: business.id,
    name: business.name,
    slug: business.slug,
    industryId: business.industryId,
    industry: business.industry ? toIndustryOption(business.industry) : null,
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
  };
}
