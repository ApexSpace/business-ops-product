import { HttpStatus } from '@nestjs/common';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import {
  SMS_MAX_SEGMENTS,
  analyzeSmsSegments,
  buildSmsTooLongMessage,
} from './sms-segment.util';

export function assertSmsBodyWithinSegmentLimit(body: string): void {
  const info = analyzeSmsSegments(body);
  if (info.segmentCount <= SMS_MAX_SEGMENTS) {
    return;
  }

  throw new AppException(
    ErrorCode.SMS_MESSAGE_TOO_LONG,
    buildSmsTooLongMessage(info),
    HttpStatus.BAD_REQUEST,
  );
}
