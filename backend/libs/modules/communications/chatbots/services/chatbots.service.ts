import { HttpStatus, Injectable } from '@nestjs/common';
import { ChatbotStatus } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  CreateChatbotDto,
  ListChatbotsQueryDto,
  UpdateChatbotDto,
} from '../dto/chatbot.dto';
import {
  ChatbotEmbedResponseDto,
  ChatbotResponseDto,
} from '../dto/chatbot-response.dto';
import { toChatbotResponse } from '../mappers/chatbot.mapper';
import { ChatbotRulesRepository } from '../repositories/chatbot-rules.repository';
import { ChatbotsRepository } from '../repositories/chatbots.repository';
import { ChatbotEmbedService } from './chatbot-embed.service';
import { generateChatbotPublicKey } from '../utils/chatbot-public-key.util';
import {
  bundleFromCreateDto,
  mergeUpdateDto,
  parseChatbotSettings,
  settingsToJson,
} from '../utils/chatbot-settings.util';

@Injectable()
export class ChatbotsService {
  constructor(
    private readonly chatbotsRepository: ChatbotsRepository,
    private readonly rulesRepository: ChatbotRulesRepository,
    private readonly embedService: ChatbotEmbedService,
    private readonly auditService: AuditService,
  ) {}

  async list(businessId: string, query: ListChatbotsQueryDto) {
    const { page, limit, skip, take } = getPaginationParams(query);
    const { items, total } = await this.chatbotsRepository.findMany(
      businessId,
      {
        skip,
        take,
        status: query.status,
      },
    );

    const enriched = await Promise.all(
      items.map(async (row) => {
        const [conversationsCount, lastMessageAt, sessionStats] =
          await Promise.all([
            this.chatbotsRepository.countConversationsForChatbot(
              businessId,
              row.id,
            ),
            this.chatbotsRepository.lastConversationMessageAt(
              businessId,
              row.id,
            ),
            this.chatbotsRepository.getSessionStats(businessId, row.id),
          ]);
        return toChatbotResponse(row, {
          conversationsCount,
          lastMessageAt,
          ...sessionStats,
        });
      }),
    );

    return { items: enriched, meta: { total, page, limit } };
  }

  async get(businessId: string, id: string): Promise<ChatbotResponseDto> {
    const chatbot = await this.requireChatbot(businessId, id);
    const [conversationsCount, lastMessageAt, sessionStats] = await Promise.all(
      [
        this.chatbotsRepository.countConversationsForChatbot(businessId, id),
        this.chatbotsRepository.lastConversationMessageAt(businessId, id),
        this.chatbotsRepository.getSessionStats(businessId, id),
      ],
    );
    return toChatbotResponse(chatbot, {
      conversationsCount,
      lastMessageAt,
      ...sessionStats,
    });
  }

  async create(
    businessId: string,
    dto: CreateChatbotDto,
    actor: RequestUser,
  ): Promise<ChatbotResponseDto> {
    const bundle = bundleFromCreateDto(dto);
    const chatbot = await this.chatbotsRepository.create({
      business: { connect: { id: businessId } },
      name: dto.name.trim(),
      description: dto.description?.trim(),
      publicKey: generateChatbotPublicKey(),
      status: ChatbotStatus.DRAFT,
      ...settingsToJson(bundle),
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'chatbot.created',
      entityType: 'Chatbot',
      entityId: chatbot.id,
    });

    return toChatbotResponse(chatbot);
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateChatbotDto,
    actor: RequestUser,
  ): Promise<ChatbotResponseDto> {
    const existing = await this.requireChatbot(businessId, id);
    const current = parseChatbotSettings(existing);
    const bundle = mergeUpdateDto(current, dto);
    const chatbot = await this.chatbotsRepository.update(id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description?.trim() ?? null }
        : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...settingsToJson(bundle),
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'chatbot.updated',
      entityType: 'Chatbot',
      entityId: chatbot.id,
    });

    return this.get(businessId, chatbot.id);
  }

  async remove(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<void> {
    await this.requireChatbot(businessId, id);
    await this.chatbotsRepository.softDelete(businessId, id);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'chatbot.deleted',
      entityType: 'Chatbot',
      entityId: id,
    });
  }

  async duplicate(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<ChatbotResponseDto> {
    const source = await this.requireChatbot(businessId, id);
    const settings = parseChatbotSettings(source);
    const copy = await this.chatbotsRepository.create({
      business: { connect: { id: businessId } },
      name: `${source.name} (copy)`,
      description: source.description,
      publicKey: generateChatbotPublicKey(),
      status: ChatbotStatus.DRAFT,
      ...settingsToJson({
        ...settings,
        messaging: { ...settings.messaging, aiEnabled: false },
      }),
    });

    const rules = await this.rulesRepository.findManyByChatbot(businessId, id);
    for (const rule of rules) {
      await this.rulesRepository.create({
        business: { connect: { id: businessId } },
        chatbot: { connect: { id: copy.id } },
        triggerType: rule.triggerType,
        triggerText: rule.triggerText,
        responseText: rule.responseText,
        sortOrder: rule.sortOrder,
        isActive: rule.isActive,
      });
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'chatbot.duplicated',
      entityType: 'Chatbot',
      entityId: copy.id,
      metadata: { sourceChatbotId: id },
    });

    return toChatbotResponse(copy);
  }

  async activate(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<ChatbotResponseDto> {
    const result = await this.update(
      businessId,
      id,
      { status: ChatbotStatus.ACTIVE },
      actor,
    );
    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'chatbot.activated',
      entityType: 'Chatbot',
      entityId: id,
    });
    return result;
  }

  async disable(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<ChatbotResponseDto> {
    const result = await this.update(
      businessId,
      id,
      { status: ChatbotStatus.DISABLED },
      actor,
    );
    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'chatbot.disabled',
      entityType: 'Chatbot',
      entityId: id,
    });
    return result;
  }

  getEmbed(publicKey: string): ChatbotEmbedResponseDto {
    return this.embedService.buildEmbed(publicKey);
  }

  async getEmbedForChatbot(
    businessId: string,
    id: string,
  ): Promise<ChatbotEmbedResponseDto> {
    const chatbot = await this.requireChatbot(businessId, id);
    const settings = parseChatbotSettings(chatbot);
    return this.embedService.buildEmbed(chatbot.publicKey, {
      position: settings.appearance.placement,
      launcherIcon: settings.appearance.launcherIcon,
      primaryColor: settings.appearance.primaryColor,
    });
  }

  private async requireChatbot(businessId: string, id: string) {
    const chatbot = await this.chatbotsRepository.findById(businessId, id);
    if (!chatbot) {
      throw new AppException(
        ErrorCode.CHATBOT_NOT_FOUND,
        'Chatbot not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return chatbot;
  }
}
