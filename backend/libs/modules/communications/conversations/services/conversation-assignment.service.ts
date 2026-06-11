import { HttpStatus, Injectable } from '@nestjs/common';
import { ConversationStatus } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { ConversationsRepository } from '../repositories/conversations.repository';
import { toConversationResponse } from '../mappers/conversation.mapper';
import { ConversationResponseDto } from '../dto/conversation-response.dto';
import { ConversationRealtimeService } from './conversation-realtime.service';

@Injectable()
export class ConversationAssignmentService {
  constructor(
    private readonly conversationsRepository: ConversationsRepository,
    private readonly auditService: AuditService,
    private readonly realtime: ConversationRealtimeService,
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
      actor,
    );
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
    actor: RequestUser,
  ): Promise<ConversationResponseDto> {
    const conversation = await this.requireConversation(
      businessId,
      conversationId,
    );

    const updated = await this.conversationsRepository.update(conversation.id, {
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

    await this.realtime.publishConversationUpdated(businessId, {
      conversationId: conversation.id,
      channel: conversation.channel,
    });

    return toConversationResponse(updated);
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
