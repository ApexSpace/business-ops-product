import { HttpStatus, Injectable } from '@nestjs/common';
import { ConversationStatus } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { PrismaService } from '@app/core/database/prisma.service';
import { ConversationsRepository } from '../repositories/conversations.repository';
import { toConversationResponse } from '../mappers/conversation.mapper';
import { ConversationResponseDto } from '../dto/conversation-response.dto';
import { ConversationRealtimeService } from './conversation-realtime.service';
import { ConversationActivityService } from './conversation-activity.service';
import { CONVERSATION_ACTIVITY_TYPES } from '../utils/conversation-activity.util';

@Injectable()
export class ConversationAssignmentService {
  constructor(
    private readonly conversationsRepository: ConversationsRepository,
    private readonly auditService: AuditService,
    private readonly realtime: ConversationRealtimeService,
    private readonly activityService: ConversationActivityService,
    private readonly prisma: PrismaService,
  ) {}

  async assign(
    businessId: string,
    conversationId: string,
    assignedToUserId: string | null | undefined,
    actor: RequestUser,
  ): Promise<ConversationResponseDto> {
    const conversation = await this.requireConversation(
      businessId,
      conversationId,
    );

    const updated = await this.conversationsRepository.update(conversation.id, {
      assignedTo: assignedToUserId
        ? { connect: { id: assignedToUserId } }
        : { disconnect: true },
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'conversation.assigned',
      entityType: 'Conversation',
      entityId: conversation.id,
      metadata: { assignedToUserId: assignedToUserId ?? null },
    });

    const fresh = await this.conversationsRepository.findById(
      businessId,
      updated.id,
    );

    await this.realtime.publishConversationUpdated(businessId, {
      conversationId: conversation.id,
      channel: conversation.channel,
    });

    return toConversationResponse(fresh!);
  }

  async close(
    businessId: string,
    conversationId: string,
    actor: RequestUser,
  ): Promise<ConversationResponseDto> {
    return this.setStatus(
      businessId,
      conversationId,
      ConversationStatus.CLOSED,
      'conversation.closed',
      CONVERSATION_ACTIVITY_TYPES.CLOSED,
      actor,
    );
  }

  async reopen(
    businessId: string,
    conversationId: string,
    actor: RequestUser,
  ): Promise<ConversationResponseDto> {
    return this.setStatus(
      businessId,
      conversationId,
      ConversationStatus.OPEN,
      'conversation.reopened',
      CONVERSATION_ACTIVITY_TYPES.REOPENED,
      actor,
    );
  }

  async markSpam(
    businessId: string,
    conversationId: string,
    actor: RequestUser,
  ): Promise<ConversationResponseDto> {
    return this.setStatus(
      businessId,
      conversationId,
      ConversationStatus.SPAM,
      'conversation.marked_spam',
      CONVERSATION_ACTIVITY_TYPES.MARKED_SPAM,
      actor,
    );
  }

  async unmarkSpam(
    businessId: string,
    conversationId: string,
    actor: RequestUser,
  ): Promise<ConversationResponseDto> {
    return this.setStatus(
      businessId,
      conversationId,
      ConversationStatus.OPEN,
      'conversation.unmarked_spam',
      CONVERSATION_ACTIVITY_TYPES.UNMARKED_SPAM,
      actor,
    );
  }

  async blockContact(
    businessId: string,
    conversationId: string,
    actor: RequestUser,
  ): Promise<ConversationResponseDto> {
    const conversation = await this.requireConversation(
      businessId,
      conversationId,
    );
    if (!conversation.contactId) {
      throw new AppException(
        ErrorCode.CONTACT_NOT_FOUND,
        'This conversation has no linked contact to block',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prisma.contact.updateMany({
      where: {
        id: conversation.contactId,
        businessId,
        deletedAt: null,
      },
      data: {
        blockedAt: new Date(),
        blockedByUserId: actor.id,
      },
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'contact.blocked',
      entityType: 'Contact',
      entityId: conversation.contactId,
      metadata: { conversationId },
    });

    await this.activityService.appendActivity(
      businessId,
      conversationId,
      CONVERSATION_ACTIVITY_TYPES.CONTACT_BLOCKED,
    );

    const fresh = await this.conversationsRepository.findById(
      businessId,
      conversationId,
    );
    return toConversationResponse(fresh!);
  }

  async unblockContact(
    businessId: string,
    conversationId: string,
    actor: RequestUser,
  ): Promise<ConversationResponseDto> {
    const conversation = await this.requireConversation(
      businessId,
      conversationId,
    );
    if (!conversation.contactId) {
      throw new AppException(
        ErrorCode.CONTACT_NOT_FOUND,
        'This conversation has no linked contact to unblock',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prisma.contact.updateMany({
      where: {
        id: conversation.contactId,
        businessId,
        deletedAt: null,
      },
      data: {
        blockedAt: null,
        blockedByUserId: null,
      },
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'contact.unblocked',
      entityType: 'Contact',
      entityId: conversation.contactId,
      metadata: { conversationId },
    });

    await this.activityService.appendActivity(
      businessId,
      conversationId,
      CONVERSATION_ACTIVITY_TYPES.CONTACT_UNBLOCKED,
    );

    const fresh = await this.conversationsRepository.findById(
      businessId,
      conversationId,
    );
    return toConversationResponse(fresh!);
  }

  async markRead(
    businessId: string,
    conversationId: string,
    actor: RequestUser,
  ): Promise<ConversationResponseDto> {
    const conversation = await this.requireConversation(
      businessId,
      conversationId,
    );

    const updated = await this.conversationsRepository.update(conversation.id, {
      unreadCount: 0,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'conversation.mark_read',
      entityType: 'Conversation',
      entityId: conversation.id,
    });

    return toConversationResponse(updated);
  }

  private async setStatus(
    businessId: string,
    conversationId: string,
    status: ConversationStatus,
    action: string,
    activityType:
      | typeof CONVERSATION_ACTIVITY_TYPES.CLOSED
      | typeof CONVERSATION_ACTIVITY_TYPES.REOPENED
      | typeof CONVERSATION_ACTIVITY_TYPES.MARKED_SPAM
      | typeof CONVERSATION_ACTIVITY_TYPES.UNMARKED_SPAM,
    actor: RequestUser,
  ): Promise<ConversationResponseDto> {
    const conversation = await this.requireConversation(
      businessId,
      conversationId,
    );

    await this.conversationsRepository.update(conversation.id, {
      status,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action,
      entityType: 'Conversation',
      entityId: conversation.id,
      metadata: { status },
    });

    await this.activityService.appendActivity(
      businessId,
      conversationId,
      activityType,
    );

    await this.realtime.publishConversationUpdated(businessId, {
      conversationId: conversation.id,
      channel: conversation.channel,
    });

    const fresh = await this.conversationsRepository.findById(
      businessId,
      conversationId,
    );
    return toConversationResponse(fresh!);
  }

  private async requireConversation(businessId: string, id: string) {
    const conversation = await this.conversationsRepository.findById(
      businessId,
      id,
    );
    if (!conversation) {
      throw new AppException(
        ErrorCode.CONVERSATION_NOT_FOUND,
        'Conversation not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return conversation;
  }
}
