import { WhatsAppTemplateStatus } from '@prisma/client';

const META_STATUS_MAP: Record<string, WhatsAppTemplateStatus> = {
  APPROVED: 'APPROVED',
  PENDING: 'PENDING',
  REJECTED: 'REJECTED',
  PAUSED: 'PAUSED',
  DISABLED: 'DISABLED',
  IN_APPEAL: 'IN_APPEAL',
  PENDING_DELETION: 'PENDING_DELETION',
  DELETED: 'DELETED',
  LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',
};

export function mapMetaTemplateStatus(
  metaStatus: string | null | undefined,
): WhatsAppTemplateStatus {
  if (!metaStatus) {
    return 'PENDING';
  }
  const normalized = metaStatus.trim().toUpperCase();
  return META_STATUS_MAP[normalized] ?? 'PENDING';
}

export function isApprovedTemplateStatus(
  status: WhatsAppTemplateStatus,
): boolean {
  return status === 'APPROVED';
}
