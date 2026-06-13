import { WhatsAppTemplateStatus } from '@prisma/client';

export interface WhatsAppTemplatePolicy {
  canSend: boolean;
  canEdit: boolean;
  canDelete: boolean;
  editBlockedReason: string | null;
}

const EDITABLE_STATUSES = new Set<WhatsAppTemplateStatus>([
  'REJECTED',
  'PAUSED',
]);

const DELETABLE_STATUSES = new Set<WhatsAppTemplateStatus>([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'PAUSED',
  'DISABLED',
  'IN_APPEAL',
  'LIMIT_EXCEEDED',
]);

export function getTemplatePolicy(
  status: WhatsAppTemplateStatus,
): WhatsAppTemplatePolicy {
  const canEdit = EDITABLE_STATUSES.has(status);
  const canDelete = DELETABLE_STATUSES.has(status);

  let editBlockedReason: string | null = null;
  if (!canEdit) {
    if (status === 'APPROVED') {
      editBlockedReason =
        'Approved templates cannot be edited. Duplicate the template to create a new version.';
    } else if (status === 'PENDING' || status === 'IN_APPEAL') {
      editBlockedReason =
        'This template is under Meta review and cannot be edited yet.';
    } else if (status === 'PENDING_DELETION' || status === 'DELETED') {
      editBlockedReason = 'This template has been deleted or is pending deletion.';
    } else {
      editBlockedReason = 'This template cannot be edited in its current status.';
    }
  }

  return {
    canSend: status === 'APPROVED',
    canEdit,
    canDelete,
    editBlockedReason,
  };
}
