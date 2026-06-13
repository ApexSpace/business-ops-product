import {
  WhatsAppMessageTemplate,
  WhatsAppTemplateCategory,
  WhatsAppTemplateStatus,
} from '@prisma/client';
import type { MetaMessageTemplate } from '../../integrations/meta/services/meta-api-client';
import { extractBodyPreview } from './template-builder.util';
import { getTemplatePolicy } from './template-policy.util';
import { mapMetaTemplateStatus } from './template-status.util';

export interface WhatsAppTemplateListItemDto {
  id: string;
  name: string;
  language: string;
  category: WhatsAppTemplateCategory;
  status: WhatsAppTemplateStatus;
  bodyPreview: string | null;
  rejectionReason: string | null;
  metaTemplateId: string | null;
  lastSyncedAt: Date | null;
  updatedAt: Date;
}

export interface WhatsAppTemplateDetailDto extends WhatsAppTemplateListItemDto {
  wabaId: string;
  parameterFormat: string;
  components: unknown;
  qualityScore: unknown;
  submittedAt: Date | null;
  createdAt: Date;
  canSend: boolean;
  canEdit: boolean;
  canDelete: boolean;
  editBlockedReason: string | null;
}

export function mapTemplateListItem(
  template: WhatsAppMessageTemplate,
): WhatsAppTemplateListItemDto {
  return {
    id: template.id,
    name: template.name,
    language: template.language,
    category: template.category,
    status: template.status,
    bodyPreview: template.bodyPreview,
    rejectionReason: template.rejectionReason,
    metaTemplateId: template.metaTemplateId,
    lastSyncedAt: template.lastSyncedAt,
    updatedAt: template.updatedAt,
  };
}

export function mapTemplateDetail(
  template: WhatsAppMessageTemplate,
): WhatsAppTemplateDetailDto {
  const policy = getTemplatePolicy(template.status);
  return {
    ...mapTemplateListItem(template),
    wabaId: template.wabaId,
    parameterFormat: template.parameterFormat,
    components: template.components,
    qualityScore: template.qualityScore,
    submittedAt: template.submittedAt,
    createdAt: template.createdAt,
    ...policy,
  };
}

export function mapMetaTemplateToUpsert(input: {
  businessId: string;
  wabaId: string;
  meta: MetaMessageTemplate;
}): {
  businessId: string;
  wabaId: string;
  name: string;
  language: string;
  category: WhatsAppTemplateCategory;
  status: WhatsAppTemplateStatus;
  parameterFormat: string;
  metaTemplateId: string | null;
  components: unknown;
  bodyPreview: string | null;
  rejectionReason: string | null;
  qualityScore: unknown;
} {
  const components = input.meta.components ?? [];
  const componentArray = Array.isArray(components) ? components : [];

  return {
    businessId: input.businessId,
    wabaId: input.wabaId,
    name: input.meta.name,
    language: input.meta.language,
    category: normalizeCategory(input.meta.category),
    status: mapMetaTemplateStatus(input.meta.status),
    parameterFormat: input.meta.parameter_format ?? 'POSITIONAL',
    metaTemplateId: input.meta.id ?? null,
    components: componentArray,
    bodyPreview: extractBodyPreview(componentArray as Record<string, unknown>[]) || null,
    rejectionReason: input.meta.rejected_reason ?? null,
    qualityScore: input.meta.quality_score ?? null,
  };
}

function normalizeCategory(
  category: string | undefined,
): WhatsAppTemplateCategory {
  const normalized = (category ?? 'UTILITY').toUpperCase();
  if (
    normalized === 'MARKETING' ||
    normalized === 'UTILITY' ||
    normalized === 'AUTHENTICATION'
  ) {
    return normalized;
  }
  return 'UTILITY';
}
