import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AUDIT_LOGGED_EVENT } from '@app/modules/platform/audit/constants/audit.constants';
import { DomainEventBusService } from '../services/domain-event-bus.service';
import type { AuditLoggedEventPayload } from '../types/domain-event.types';
import { AUDIT_ACTION_TRIGGER_MAP } from '../utils/audit-action-trigger.map';
import {
  buildAutomationDomainEventPayload,
  shouldPublishAutomationEvent,
} from '../utils/audit-domain-event.builder';

@Injectable()
export class AutomationAuditListener {
  private readonly logger = new Logger(AutomationAuditListener.name);

  constructor(private readonly domainEventBus: DomainEventBusService) {}

  @OnEvent(AUDIT_LOGGED_EVENT, { async: true })
  handleAuditLogged(audit: AuditLoggedEventPayload): void {
    if (!shouldPublishAutomationEvent(audit)) {
      return;
    }

    const triggerKeys = AUDIT_ACTION_TRIGGER_MAP[audit.action] ?? [];
    if (triggerKeys.length === 0) {
      return;
    }

    for (const triggerKey of triggerKeys) {
      const payload = buildAutomationDomainEventPayload(triggerKey, audit);
      if (!payload) {
        this.logger.debug(
          `Skipped automation event for ${triggerKey} (${audit.action})`,
        );
        continue;
      }

      const published = this.domainEventBus.publish(payload);
      if (published) {
        this.logger.debug(
          `Published ${payload.triggerKey} for audit ${audit.action}`,
        );
      }
    }
  }
}
