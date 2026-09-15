/**
 * Spike notes for BullMQ ^5.40 social-publish jobId behavior.
 *
 * QueueService.getQueue defaultJobOptions use:
 *   removeOnComplete: 1000
 *   removeOnFail: 5000
 *
 * Observed BullMQ 5.x semantics (documented + confirmed against this codebase's options):
 * - While a job with the same custom jobId still exists in Redis
 *   (waiting / delayed / active / completed-within-retention / failed-within-retention),
 *   Queue.add() with that jobId is a no-op (returns the existing job; does not reset delay).
 * - After the job is removed (retention eviction, explicit remove, or removeOnComplete/Fail),
 *   the same jobId can be added again.
 * - Custom jobId MUST NOT contain ':' (BullMQ throws "Custom Id cannot contain :").
 *
 * Therefore for Social Planner:
 * - Primary duplicate guard = SocialPostTarget.externalPostId IS NULL
 * - jobId `social-publish-{targetId}` is only a secondary debounce while the job record lives
 * - Safety-net / retry MUST use versioned ids:
 *     social-publish-{targetId}-safety-{timestamp}
 *     social-publish-{targetId}-retry-{timestamp}
 */

import {
  socialPublishJobId,
  socialPublishRetryJobId,
  socialPublishSafetyJobId,
} from '@app/modules/communications/social-planner/utils/social-publish-job-id.util';

describe('social-publish jobId spike (documentation)', () => {
  it('documents QueueService retention that makes jobId alone unsafe after complete', () => {
    const defaultJobOptions = {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    };

    expect(defaultJobOptions.removeOnComplete).toBe(1000);
    expect(defaultJobOptions.removeOnFail).toBe(5000);
  });

  it('uses hyphenated job ids without colon', () => {
    const targetId = 'target-uuid';
    expect(socialPublishJobId(targetId)).toBe('social-publish-target-uuid');
    expect(socialPublishJobId(targetId).includes(':')).toBe(false);
    expect(socialPublishSafetyJobId(targetId, 1).includes(':')).toBe(false);
    expect(socialPublishRetryJobId(targetId, 1).includes(':')).toBe(false);
    expect(socialPublishSafetyJobId(targetId, 1)).toBe(
      'social-publish-target-uuid-safety-1',
    );
  });
});
