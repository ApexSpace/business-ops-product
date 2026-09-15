import { HttpStatus, Injectable } from '@nestjs/common';
import {
  AppointmentAutomatedMessageEventType,
  AppointmentAutomatedMessageTriggerKind,
  AppointmentStatus,
} from '@prisma/client';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  BOOKED_CATALOG,
  CONFIRMATION_REQUEST_KEYS,
  parseEventType,
} from '../constants/defaults';
import {
  CreateAppointmentAutomatedMessageDto,
  CreateAppointmentAutomatedMessageTriggerDto,
  UpdateAppointmentAutomatedMessageDto,
  UpdateAppointmentAutomatedMessageSettingsDto,
  UpdateAppointmentAutomatedMessageTriggerDto,
} from '../dto/appointment-automated-messages.dto';
import { toSettingsDto, toTriggerDto, toMessageDto } from '../mappers/appointment-automated-messages.mapper';
import { AppointmentAutomatedMessagesRepository } from '../repositories/appointment-automated-messages.repository';
import { offsetToHours } from '../utils/source-scope.util';

const MAX_TRIGGERS = 10;
const MAX_MESSAGES_PER_TRIGGER = 5;

@Injectable()
export class AppointmentAutomatedMessagesService {
  constructor(
    private readonly repository: AppointmentAutomatedMessagesRepository,
    private readonly auditService: AuditService,
  ) {}

  resolveEventType(raw: string): AppointmentAutomatedMessageEventType {
    const eventType = parseEventType(raw);
    if (!eventType) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Invalid event type',
        HttpStatus.BAD_REQUEST,
      );
    }
    return eventType;
  }

  async get(businessId: string, eventTypeRaw: string) {
    const eventType = this.resolveEventType(eventTypeRaw);
    const settings = await this.repository.ensureSettings(businessId, eventType);
    return toSettingsDto(settings);
  }

  async updateSettings(
    businessId: string,
    eventTypeRaw: string,
    dto: UpdateAppointmentAutomatedMessageSettingsDto,
    actor: RequestUser,
  ) {
    const eventType = this.resolveEventType(eventTypeRaw);
    if (eventType !== AppointmentAutomatedMessageEventType.BOOKED) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'defaultStatus is only supported for BOOKED',
        HttpStatus.BAD_REQUEST,
      );
    }

    const settings = await this.repository.ensureSettings(businessId, eventType);
    if (dto.defaultStatus !== undefined) {
      if (
        dto.defaultStatus !== AppointmentStatus.UNCONFIRMED &&
        dto.defaultStatus !== AppointmentStatus.CONFIRMED
      ) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'defaultStatus must be UNCONFIRMED or CONFIRMED',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const updated = await this.repository.updateSettings(settings.id, {
      defaultStatus: dto.defaultStatus,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'appointment_automated_messages.updated',
      entityType: 'BusinessAppointmentAutomatedMessageSettings',
      entityId: updated.id,
    });

    return toSettingsDto(updated);
  }

  getCatalog(eventTypeRaw: string) {
    const eventType = this.resolveEventType(eventTypeRaw);
    if (eventType === AppointmentAutomatedMessageEventType.BOOKED) {
      return BOOKED_CATALOG.map((item) => ({
        notificationKey: item.notificationKey,
        label: item.label,
        channels: [...item.channels],
      }));
    }
    return [];
  }

  async createTrigger(
    businessId: string,
    eventTypeRaw: string,
    dto: CreateAppointmentAutomatedMessageTriggerDto,
    actor: RequestUser,
  ) {
    const eventType = this.resolveEventType(eventTypeRaw);
    const settings = await this.repository.ensureSettings(businessId, eventType);

    if (
      eventType !== AppointmentAutomatedMessageEventType.BOOKED &&
      dto.kind === AppointmentAutomatedMessageTriggerKind.BEFORE_START
    ) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'BEFORE_START triggers are only allowed for BOOKED',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (dto.kind === AppointmentAutomatedMessageTriggerKind.IMMEDIATE) {
      const immediateCount = await this.repository.countTriggers(
        settings.id,
        AppointmentAutomatedMessageTriggerKind.IMMEDIATE,
      );
      if (immediateCount > 0) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'An IMMEDIATE trigger already exists',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (dto.kind === AppointmentAutomatedMessageTriggerKind.BEFORE_START) {
      if (dto.offsetValue == null || !dto.offsetUnit) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'offsetValue and offsetUnit are required for BEFORE_START triggers',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const total = await this.repository.countTriggers(settings.id);
    if (total >= MAX_TRIGGERS) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        `Maximum of ${MAX_TRIGGERS} triggers allowed`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const trigger = await this.repository.createTrigger(settings.id, {
      kind: dto.kind,
      offsetValue:
        dto.kind === AppointmentAutomatedMessageTriggerKind.BEFORE_START
          ? dto.offsetValue!
          : null,
      offsetUnit:
        dto.kind === AppointmentAutomatedMessageTriggerKind.BEFORE_START
          ? dto.offsetUnit!
          : null,
      sortOrder: dto.sortOrder ?? total,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'appointment_automated_message_trigger.created',
      entityType: 'AppointmentAutomatedMessageTrigger',
      entityId: trigger.id,
    });

    return toTriggerDto({ ...trigger, messages: [] });
  }

  async updateTrigger(
    businessId: string,
    triggerId: string,
    dto: UpdateAppointmentAutomatedMessageTriggerDto,
    actor: RequestUser,
  ) {
    const trigger = await this.requireOwnedTrigger(businessId, triggerId);

    if (trigger.kind === AppointmentAutomatedMessageTriggerKind.IMMEDIATE) {
      if (dto.offsetValue !== undefined || dto.offsetUnit !== undefined) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'IMMEDIATE triggers do not have offsets',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const updated = await this.repository.updateTrigger(triggerId, {
      ...(dto.offsetValue !== undefined ? { offsetValue: dto.offsetValue } : {}),
      ...(dto.offsetUnit !== undefined ? { offsetUnit: dto.offsetUnit } : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'appointment_automated_message_trigger.updated',
      entityType: 'AppointmentAutomatedMessageTrigger',
      entityId: triggerId,
    });

    return toTriggerDto(updated);
  }

  async deleteTrigger(
    businessId: string,
    triggerId: string,
    actor: RequestUser,
  ) {
    const trigger = await this.requireOwnedTrigger(businessId, triggerId);

    if (trigger.kind === AppointmentAutomatedMessageTriggerKind.IMMEDIATE) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Cannot delete the IMMEDIATE trigger',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.repository.deleteTrigger(triggerId);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'appointment_automated_message_trigger.deleted',
      entityType: 'AppointmentAutomatedMessageTrigger',
      entityId: triggerId,
    });
  }

  async createMessage(
    businessId: string,
    triggerId: string,
    dto: CreateAppointmentAutomatedMessageDto,
    actor: RequestUser,
  ) {
    const trigger = await this.requireOwnedTrigger(businessId, triggerId);
    this.assertMessageAllowed(trigger, dto.notificationKey);

    const count = await this.repository.countMessages(triggerId);
    if (count >= MAX_MESSAGES_PER_TRIGGER) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        `Maximum of ${MAX_MESSAGES_PER_TRIGGER} messages per trigger`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const message = await this.repository.createMessage(triggerId, {
      sourceScope: dto.sourceScope,
      channel: dto.channel,
      notificationKey: dto.notificationKey,
      sortOrder: dto.sortOrder ?? count,
      enabled: dto.enabled ?? true,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'appointment_automated_message.created',
      entityType: 'AppointmentAutomatedMessage',
      entityId: message.id,
    });

    return toMessageDto(message);
  }

  async updateMessage(
    businessId: string,
    messageId: string,
    dto: UpdateAppointmentAutomatedMessageDto,
    actor: RequestUser,
  ) {
    const message = await this.requireOwnedMessage(businessId, messageId);
    const notificationKey = dto.notificationKey ?? message.notificationKey;
    this.assertMessageAllowed(message.trigger, notificationKey);

    const updated = await this.repository.updateMessage(messageId, {
      ...(dto.sourceScope !== undefined ? { sourceScope: dto.sourceScope } : {}),
      ...(dto.channel !== undefined ? { channel: dto.channel } : {}),
      ...(dto.notificationKey !== undefined
        ? { notificationKey: dto.notificationKey }
        : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'appointment_automated_message.updated',
      entityType: 'AppointmentAutomatedMessage',
      entityId: messageId,
    });

    return toMessageDto(updated);
  }

  async deleteMessage(
    businessId: string,
    messageId: string,
    actor: RequestUser,
  ) {
    await this.requireOwnedMessage(businessId, messageId);
    await this.repository.deleteMessage(messageId);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'appointment_automated_message.deleted',
      entityType: 'AppointmentAutomatedMessage',
      entityId: messageId,
    });
  }

  /** Used by appointments create / reminder runtime. */
  async ensureBookedSettings(businessId: string) {
    return this.repository.ensureSettings(
      businessId,
      AppointmentAutomatedMessageEventType.BOOKED,
    );
  }

  async findBookedSettings(businessId: string) {
    return this.repository.findByBusinessAndEvent(
      businessId,
      AppointmentAutomatedMessageEventType.BOOKED,
    );
  }

  private assertMessageAllowed(
    trigger: {
      kind: AppointmentAutomatedMessageTriggerKind;
      offsetValue: number | null;
      offsetUnit: string | null;
      settings: { defaultStatus: AppointmentStatus | null; eventType: AppointmentAutomatedMessageEventType };
    },
    notificationKey: string,
  ) {
    const catalogKeys = new Set<string>(
      BOOKED_CATALOG.map((item) => item.notificationKey),
    );
    if (
      trigger.settings.eventType ===
        AppointmentAutomatedMessageEventType.BOOKED &&
      !catalogKeys.has(notificationKey) &&
      !CONFIRMATION_REQUEST_KEYS.has(notificationKey)
    ) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'notificationKey is not allowed for this event',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (CONFIRMATION_REQUEST_KEYS.has(notificationKey)) {
      if (trigger.settings.defaultStatus !== AppointmentStatus.UNCONFIRMED) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Confirmation-request messages require defaultStatus UNCONFIRMED',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (
        trigger.kind === AppointmentAutomatedMessageTriggerKind.BEFORE_START &&
        trigger.offsetValue != null &&
        trigger.offsetUnit
      ) {
        const hours = offsetToHours(
          trigger.offsetValue,
          trigger.offsetUnit as 'DAYS' | 'HOURS',
        );
        if (hours < 24) {
          throw new AppException(
            ErrorCode.BAD_REQUEST,
            'Confirmation-request messages cannot be sent less than 24 hours before the appointment',
            HttpStatus.BAD_REQUEST,
          );
        }
      }
    }
  }

  private async requireOwnedTrigger(businessId: string, triggerId: string) {
    const trigger = await this.repository.findTriggerById(triggerId);
    if (!trigger || trigger.settings.businessId !== businessId) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Trigger not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return trigger;
  }

  private async requireOwnedMessage(businessId: string, messageId: string) {
    const message = await this.repository.findMessageById(messageId);
    if (!message || message.trigger.settings.businessId !== businessId) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Message not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return message;
  }
}
