import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AUTOMATION_DOMAIN_EVENT } from '../constants/automation-events.constants';
import type { AutomationDomainEventPayload } from '../types/domain-event.types';
import { AutomationEngineService } from '../services/automation-engine.service';

@Injectable()
export class AutomationStopOnResponseListener {
  private readonly logger = new Logger(AutomationStopOnResponseListener.name);

  constructor(private readonly engineService: AutomationEngineService) {}

  @OnEvent(AUTOMATION_DOMAIN_EVENT, { async: true })
  async handleDomainEvent(event: AutomationDomainEventPayload): Promise<void> {
    if (event.triggerKey !== 'conversation.message_received') {
      return;
    }

    try {
      await this.engineService.cancelRunsOnContactResponse(event);
    } catch (error) {
      this.logger.error(
        `Stop-on-response handling failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
