import { FormSubmission } from '@prisma/client';
import { FormSubmissionListItemResponseDto } from '../dto/form-submission-list-item-response.dto';

function toRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function toFormSubmissionListItemResponse(
  submission: FormSubmission,
): FormSubmissionListItemResponseDto {
  const data = toRecord(submission.data) ?? {};
  const metadata = submission.metadata ? toRecord(submission.metadata) : null;

  return {
    id: submission.id,
    formId: submission.formId,
    data,
    metadata,
    createdAt: submission.createdAt.toISOString(),
  };
}
