import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { assertSmsBodyWithinSegmentLimit } from './sms-segment-limit.util';
import { SMS_GSM7_MULTI_LIMIT, SMS_MAX_SEGMENTS } from './sms-segment.util';

describe('assertSmsBodyWithinSegmentLimit', () => {
  it('allows messages within 2 segments', () => {
    expect(() =>
      assertSmsBodyWithinSegmentLimit('a'.repeat(160)),
    ).not.toThrow();
    expect(() =>
      assertSmsBodyWithinSegmentLimit(
        'a'.repeat(SMS_GSM7_MULTI_LIMIT * SMS_MAX_SEGMENTS),
      ),
    ).not.toThrow();
  });

  it('rejects messages over 2 segments', () => {
    try {
      assertSmsBodyWithinSegmentLimit(
        'a'.repeat(SMS_GSM7_MULTI_LIMIT * SMS_MAX_SEGMENTS + 1),
      );
      fail('expected AppException');
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).getResponse()).toEqual(
        expect.objectContaining({
          code: ErrorCode.SMS_MESSAGE_TOO_LONG,
        }),
      );
    }
  });
});
