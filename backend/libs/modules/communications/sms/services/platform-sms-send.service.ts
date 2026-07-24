import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { TwilioApiClient } from '@app/modules/integrations/twilio/services/twilio-api-client';
import { SmsModeResolverService } from '@app/modules/integrations/twilio/services/sms-mode-resolver.service';
import { assertSmsBodyWithinSegmentLimit } from '@app/modules/communications/sms/utils/sms-segment-limit.util';
import { PlatformSmsComplianceService } from './platform-sms-compliance.service';

export interface PlatformSmsSendParams {
  businessId: string;
  to: string;
  body: string;
  resourceId?: string;
}

@Injectable()
export class PlatformSmsSendService {
  constructor(
    private readonly smsModeResolver: SmsModeResolverService,
    private readonly twilioApiClient: TwilioApiClient,
    private readonly platformSmsCompliance: PlatformSmsComplianceService,
  ) {}

  /**
   * Outbound notification SMS via the business's auto-assigned Codesol number
   * when present; otherwise the shared TWILIO_PLATFORM_FROM_NUMBER fallback.
   * Always uses primary-account credentials (not BYO Twilio).
   */
  async sendNotification(params: PlatformSmsSendParams) {
    const context = await this.smsModeResolver.resolveNotificationForBusiness(
      params.businessId,
    );
    if (!context) {
      throw new AppException(
        ErrorCode.CONVERSATION_CHANNEL_NOT_READY,
        'Platform SMS is not configured. Enable TWILIO_ENABLED and set Twilio credentials.',
        HttpStatus.BAD_REQUEST,
      );
    }

    assertSmsBodyWithinSegmentLimit(params.body);

    await this.platformSmsCompliance.assertCanSend(
      context.fromNumber,
      params.to,
    );

    return this.twilioApiClient.sendMessage({
      accountSid: context.accountSid,
      authToken: context.authToken,
      from: context.fromNumber,
      to: params.to,
      body: params.body,
      statusCallback: this.twilioApiClient.buildStatusCallbackUrl(),
    });
  }
}
