import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import {
  CreateChatbotRuleDto,
  UpdateChatbotRuleDto,
} from '../dto/chatbot.dto';
import { ChatbotRuleResponseDto } from '../dto/chatbot-response.dto';
import { toChatbotRuleResponse } from '../mappers/chatbot.mapper';
import { ChatbotRulesRepository } from '../repositories/chatbot-rules.repository';
import { ChatbotsRepository } from '../repositories/chatbots.repository';

@Injectable()
export class ChatbotRulesService {
  constructor(
    private readonly chatbotsRepository: ChatbotsRepository,
    private readonly rulesRepository: ChatbotRulesRepository,
  ) {}

  async list(
    businessId: string,
    chatbotId: string,
  ): Promise<ChatbotRuleResponseDto[]> {
    await this.requireChatbot(businessId, chatbotId);
    const rules = await this.rulesRepository.findManyByChatbot(
      businessId,
      chatbotId,
    );
    return rules.map(toChatbotRuleResponse);
  }

  async create(
    businessId: string,
    chatbotId: string,
    dto: CreateChatbotRuleDto,
  ): Promise<ChatbotRuleResponseDto> {
    await this.requireChatbot(businessId, chatbotId);
    const rule = await this.rulesRepository.create({
      business: { connect: { id: businessId } },
      chatbot: { connect: { id: chatbotId } },
      triggerType: dto.triggerType,
      triggerText: dto.triggerText.trim(),
      responseText: dto.responseText.trim(),
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
    });
    return toChatbotRuleResponse(rule);
  }

  async update(
    businessId: string,
    chatbotId: string,
    ruleId: string,
    dto: UpdateChatbotRuleDto,
  ): Promise<ChatbotRuleResponseDto> {
    const rule = await this.requireRule(businessId, chatbotId, ruleId);
    const updated = await this.rulesRepository.update(rule.id, {
      ...(dto.triggerType !== undefined ? { triggerType: dto.triggerType } : {}),
      ...(dto.triggerText !== undefined
        ? { triggerText: dto.triggerText.trim() }
        : {}),
      ...(dto.responseText !== undefined
        ? { responseText: dto.responseText.trim() }
        : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    });
    return toChatbotRuleResponse(updated);
  }

  async remove(
    businessId: string,
    chatbotId: string,
    ruleId: string,
  ): Promise<void> {
    await this.requireRule(businessId, chatbotId, ruleId);
    await this.rulesRepository.delete(businessId, chatbotId, ruleId);
  }

  private async requireChatbot(businessId: string, chatbotId: string) {
    const chatbot = await this.chatbotsRepository.findById(businessId, chatbotId);
    if (!chatbot) {
      throw new AppException(
        ErrorCode.CHATBOT_NOT_FOUND,
        'Chatbot not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return chatbot;
  }

  private async requireRule(
    businessId: string,
    chatbotId: string,
    ruleId: string,
  ) {
    const rule = await this.rulesRepository.findById(
      businessId,
      chatbotId,
      ruleId,
    );
    if (!rule) {
      throw new AppException(
        ErrorCode.CHATBOT_RULE_NOT_FOUND,
        'Rule not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return rule;
  }
}
