import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RootConfig } from '@app/core/config/configuration';
import { normalizeE164Phone } from '@app/core/config/twilio/twilio.config';
import { PlatformSmsSuppressionRepository } from '../repositories/platform-sms-suppression.repository';
import {
  buildHelpTwiml,
  buildOptInTwiml,
  buildOptOutTwiml,
  parseSmsComplianceKeyword,
} from '../utils/sms-compliance-keywords.util';

export interface PlatformSmsComplianceResult {
  handled: boolean;
  twiml?: string;
}

@Injectable()
export class PlatformSmsComplianceService {
  private readonly logger = new Logger(PlatformSmsComplianceService.name);

  constructor(
    private readonly configService: ConfigService<RootConfig, true>,
    private readonly suppressionRepository: PlatformSmsSuppressionRepository,
  ) {}

  async handleInbound(params: {
    to: string;
    from: string;
    body: string | null;
    businessId?: string | null;
  }): Promise<PlatformSmsComplianceResult> {
    const twilioConfig = this.configService.get('twilio', { infer: true });
    if (!twilioConfig.platformFromNumber) {
      return { handled: false };
    }

    const platformFrom = normalizeE164Phone(twilioConfig.platformFromNumber);
    const customerPhone = normalizeE164Phone(params.from);
    const keyword = parseSmsComplianceKeyword(params.body);

    if (!keyword) {
      this.logger.log(
        `Ignoring non-keyword inbound SMS on platform number from ${customerPhone}`,
      );
      return { handled: true };
    }

    if (keyword === 'opt_out') {
      await this.suppressionRepository.setOptedOut({
        platformFromNumber: platformFrom,
        customerPhoneE164: customerPhone,
        businessId: params.businessId ?? null,
      });
      return { handled: true, twiml: buildOptOutTwiml() };
    }

    if (keyword === 'opt_in') {
      await this.suppressionRepository.setOptedIn({
        platformFromNumber: platformFrom,
        customerPhoneE164: customerPhone,
        businessId: params.businessId ?? null,
      });
      return { handled: true, twiml: buildOptInTwiml() };
    }

    return { handled: true, twiml: buildHelpTwiml() };
  }

  async assertCanSend(platformFromNumber: string, to: string): Promise<void> {
    const suppressed = await this.suppressionRepository.isSuppressed(
      normalizeE164Phone(platformFromNumber),
      normalizeE164Phone(to),
    );
    if (suppressed) {
      throw new Error('Recipient has opted out of platform SMS');
    }
  }
}
