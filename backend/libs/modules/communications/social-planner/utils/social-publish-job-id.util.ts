/**
 * BullMQ custom jobId cannot contain ':' (throws "Custom Id cannot contain :").
 * Keep these helpers as the single source of social-publish job id formats.
 */
export function socialPublishJobId(targetId: string): string {
  return `social-publish-${targetId}`;
}

export function socialPublishRetryJobId(targetId: string, at = Date.now()): string {
  return `social-publish-${targetId}-retry-${at}`;
}

export function socialPublishSafetyJobId(
  targetId: string,
  at = Date.now(),
): string {
  return `social-publish-${targetId}-safety-${at}`;
}
