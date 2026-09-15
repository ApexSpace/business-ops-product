import { Injectable } from '@nestjs/common';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { ListConversationsQueryDto } from '../dto/list-conversations-query.dto';
import { UnifiedConversationThreadDto } from '../dto/unified-conversation-response.dto';
import { ConversationsRepository } from '../repositories/conversations.repository';
import { resolveAssignedConversationScope } from '../utils/conversation-staff-access.util';
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
    user: RequestUser,
  ): Promise<{
    items: UnifiedConversationThreadDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { page, limit, skip, take } = getPaginationParams(query);
    const scope = resolveAssignedConversationScope(user, {
      assignedToMe: query.assignedToMe,
    });

    const { items: conversations } =
      await this.conversationsRepository.findMany(businessId, {
        skip: 0,
        take: UNIFIED_FETCH_CAP,
        channel: query.channel,
        status: query.status,
        assignedToMe: scope.assignedToMe,
        assignedToUserId: scope.assignedToUserId,
        currentUserId: user.id,
        contactId: query.contactId,
        resourceId: query.resourceId,
        search: query.search?.trim() || undefined,
      });

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
