import { Injectable, Logger } from '@nestjs/common';
import { EventPublisherService } from '@app/core/events/event-publisher.service';
import { AUTOMATION_DOMAIN_EVENT } from '../constants/automation-events.constants';
import { TRIGGER_BY_KEY } from '../registries/trigger.registry';
import type { AutomationDomainEventPayload } from '../types/domain-event.types';

@Injectable()
export class DomainEventBusService {
  private readonly logger = new Logger(DomainEventBusService.name);

  constructor(private readonly eventPublisher: EventPublisherService) {}

  publish(event: AutomationDomainEventPayload): boolean {
    const trigger = TRIGGER_BY_KEY[event.triggerKey];
    if (!trigger) {
      this.logger.warn(`Unknown automation trigger key: ${event.triggerKey}`);
      return false;
    }

    const parsed = trigger.payloadSchema.safeParse({
      businessId: event.businessId,
      subjectId: event.subjectId,
      subjectType: event.subjectType,
      contextEntityId: event.contextEntityId,
      contextEntityType: event.contextEntityType,
      metadata: event.metadata,
    });

    if (!parsed.success) {
      this.logger.warn(
        `Invalid automation payload for ${event.triggerKey}: ${parsed.error.message}`,
      );
      return false;
    }

    this.eventPublisher.publish(AUTOMATION_DOMAIN_EVENT, event);
    return true;
  }
}
