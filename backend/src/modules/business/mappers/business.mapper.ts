import { Business, Industry } from '@prisma/client';
import { toIndustryOption } from '../../industries/mappers/industry.mapper';
import { BusinessResponseDto } from '../dto/business-response.dto';

type BusinessWithIndustry = Business & { industry?: Industry | null };

export function toBusinessResponse(
  business: BusinessWithIndustry,
): BusinessResponseDto {
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
    settings: business.settings as Record<string, unknown> | null,
    createdById: business.createdById,
    createdAt: business.createdAt,
    updatedAt: business.updatedAt,
  };
}
