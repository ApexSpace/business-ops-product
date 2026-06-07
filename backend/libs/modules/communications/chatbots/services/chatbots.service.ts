import { HttpStatus, Injectable } from '@nestjs/common';
import { ChatbotStatus } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import {
  CreateChatbotDto,
  ListChatbotsQueryDto,
  UpdateChatbotDto,
} from '../dto/chatbot.dto';
import { ChatbotEmbedResponseDto, ChatbotResponseDto } from '../dto/chatbot-response.dto';
import { toChatbotResponse } from '../mappers/chatbot.mapper';
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
    private readonly embedService: ChatbotEmbedService,
  ) {}

  async list(businessId: string, query: ListChatbotsQueryDto) {
    const { page, limit, skip, take } = getPaginationParams(query);
    const { items, total } = await this.chatbotsRepository.findMany(businessId, {
      skip,
      take,
    });

    const enriched = await Promise.all(
      items.map(async (row) => {
        const conversationsCount =
          await this.chatbotsRepository.countConversationsForChatbot(
            businessId,
            row.id,
          );
        const lastMessageAt =
          await this.chatbotsRepository.lastConversationMessageAt(
            businessId,
            row.id,
          );
        return toChatbotResponse(row, { conversationsCount, lastMessageAt });
      }),
    );

    return { items: enriched, meta: { total, page, limit } };
  }

  async get(businessId: string, id: string): Promise<ChatbotResponseDto> {
    const chatbot = await this.requireChatbot(businessId, id);
    const conversationsCount =
      await this.chatbotsRepository.countConversationsForChatbot(
        businessId,
        id,
      );
    const lastMessageAt =
      await this.chatbotsRepository.lastConversationMessageAt(businessId, id);
    return toChatbotResponse(chatbot, { conversationsCount, lastMessageAt });
  }

  async create(
    businessId: string,
    dto: CreateChatbotDto,
    _actor: RequestUser,
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
    return toChatbotResponse(chatbot);
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateChatbotDto,
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
    return this.get(businessId, chatbot.id);
  }

  async remove(businessId: string, id: string): Promise<void> {
    await this.requireChatbot(businessId, id);
    await this.chatbotsRepository.softDelete(businessId, id);
  }

  async duplicate(businessId: string, id: string): Promise<ChatbotResponseDto> {
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
    return toChatbotResponse(copy);
  }

  async activate(businessId: string, id: string): Promise<ChatbotResponseDto> {
    return this.update(businessId, id, { status: ChatbotStatus.ACTIVE });
  }

  async disable(businessId: string, id: string): Promise<ChatbotResponseDto> {
    return this.update(businessId, id, { status: ChatbotStatus.DISABLED });
  }

  getEmbed(publicKey: string): ChatbotEmbedResponseDto {
    return this.embedService.buildEmbed(publicKey);
  }

  async getEmbedForChatbot(
    businessId: string,
    id: string,
  ): Promise<ChatbotEmbedResponseDto> {
    const chatbot = await this.requireChatbot(businessId, id);
    return this.embedService.buildEmbed(chatbot.publicKey);
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
