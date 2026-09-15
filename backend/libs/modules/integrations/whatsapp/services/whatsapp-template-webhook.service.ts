import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppTemplateStatus } from '@prisma/client';
import { WhatsAppTemplateRepository } from '../repositories/whatsapp-template.repository';
import { mapMetaTemplateStatus } from '../utils/template-status.util';
import type { WhatsAppTemplateStatusUpdate } from '../utils/template-webhook.util';

@Injectable()
export class WhatsAppTemplateWebhookService {
  private readonly logger = new Logger(WhatsAppTemplateWebhookService.name);

  constructor(
    private readonly templateRepository: WhatsAppTemplateRepository,
  ) {}

  async processStatusUpdates(
    updates: WhatsAppTemplateStatusUpdate[],
  ): Promise<void> {
    for (const update of updates) {
      const status = mapMetaTemplateStatus(update.event);
      const count = await this.templateRepository.updateStatusByWebhook({
        wabaId: update.wabaId,
        name: update.name,
        language: update.language,
        status,
        rejectionReason: update.reason,
        metaTemplateId: update.metaTemplateId,
      });

      if (count === 0) {
        this.logger.debug(
          `No local template matched webhook update name=${update.name} language=${update.language} waba=${update.wabaId}`,
        );
      }
    }
  }

  mapWebhookEventToStatus(event: string): WhatsAppTemplateStatus {
    return mapMetaTemplateStatus(event);
  }
}
