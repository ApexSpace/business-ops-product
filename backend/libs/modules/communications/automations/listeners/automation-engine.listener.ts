import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AUTOMATION_DOMAIN_EVENT } from '../constants/automation-events.constants';
import type { AutomationDomainEventPayload } from '../types/domain-event.types';
import { AutomationEngineService } from '../services/automation-engine.service';

@Injectable()
export class AutomationEngineListener {
  private readonly logger = new Logger(AutomationEngineListener.name);

  constructor(private readonly engineService: AutomationEngineService) {}

  @OnEvent(AUTOMATION_DOMAIN_EVENT, { async: true })
  async handleDomainEvent(event: AutomationDomainEventPayload): Promise<void> {
    try {
      await this.engineService.handleDomainEvent(event);
    } catch (error) {
      this.logger.error(
        `Automation engine failed for ${event.triggerKey}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
