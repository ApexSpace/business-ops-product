import { HttpStatus, Injectable } from '@nestjs/common';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { ListConversationsQueryDto } from '../dto/list-conversations-query.dto';
import { UpdateConversationDto } from '../dto/update-conversation.dto';
import { ConversationResponseDto } from '../dto/conversation-response.dto';
import { toConversationResponse } from '../mappers/conversation.mapper';
import { ConversationsRepository } from '../repositories/conversations.repository';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly conversationsRepository: ConversationsRepository,
    private readonly auditService: AuditService,
  ) {}

  async list(
    businessId: string,
    query: ListConversationsQueryDto,
    currentUserId: string,
  ): Promise<{
    items: ConversationResponseDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { page, limit, skip, take } = getPaginationParams(query);
    const { items, total } = await this.conversationsRepository.findMany(
      businessId,
      {
        skip,
        take,
        channel: query.channel,
        status: query.status,
        assignedToMe: query.assignedToMe,
        currentUserId,
        contactId: query.contactId,
        resourceId: query.resourceId,
        search: query.search,
      },
    );

    return {
      items: items.map((row) => toConversationResponse(row)),
      meta: { total, page, limit },
    };
  }

  async getById(
    businessId: string,
    id: string,
  ): Promise<ConversationResponseDto> {
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
    return toConversationResponse(conversation);
  }

  async listByContact(
    businessId: string,
    contactId: string,
  ): Promise<ConversationResponseDto[]> {
    const items = await this.conversationsRepository.findByContactId(
      businessId,
      contactId,
    );
    return items.map((row) => toConversationResponse(row));
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateConversationDto,
    actor: RequestUser,
  ): Promise<ConversationResponseDto> {
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

    const updated = await this.conversationsRepository.update(conversation.id, {
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.assignedToUserId !== undefined
        ? {
            assignedTo: dto.assignedToUserId
              ? { connect: { id: dto.assignedToUserId } }
              : { disconnect: true },
          }
        : {}),
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'conversation.updated',
      entityType: 'Conversation',
      entityId: conversation.id,
      metadata: { ...dto },
    });

    const fresh = await this.conversationsRepository.findById(
      businessId,
      updated.id,
    );
    return toConversationResponse(fresh!);
  }
}
