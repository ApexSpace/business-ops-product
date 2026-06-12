import { Injectable } from '@nestjs/common';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { ListConversationsQueryDto } from '../dto/list-conversations-query.dto';
import { UnifiedConversationThreadDto } from '../dto/unified-conversation-response.dto';
import { ConversationsRepository } from '../repositories/conversations.repository';
import { groupConversationsIntoUnifiedThreads } from '../utils/unified-threads.util';

const UNIFIED_FETCH_CAP = 1000;

@Injectable()
export class UnifiedConversationsService {
  constructor(
    private readonly conversationsRepository: ConversationsRepository,
  ) {}

  async list(
    businessId: string,
    query: ListConversationsQueryDto,
    currentUserId: string,
  ): Promise<{
    items: UnifiedConversationThreadDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { page, limit, skip, take } = getPaginationParams(query);

    const { items: conversations } = await this.conversationsRepository.findMany(
      businessId,
      {
        skip: 0,
        take: UNIFIED_FETCH_CAP,
        channel: query.channel,
        status: query.status,
        assignedToMe: query.assignedToMe,
        currentUserId,
        contactId: query.contactId,
        resourceId: query.resourceId,
        search: query.search?.trim() || undefined,
      },
    );

    const threads = groupConversationsIntoUnifiedThreads(conversations, {
      channel: query.channel,
    });

    const paginated = threads.slice(skip, skip + take);

    return {
      items: paginated,
      meta: {
        total: threads.length,
        page,
        limit,
      },
    };
  }
}
