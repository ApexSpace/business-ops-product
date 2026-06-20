import { HttpStatus, Injectable } from '@nestjs/common';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  CreateChatbotRuleDto,
  ImportChatbotRulesDto,
  PreviewChatbotRuleDto,
  ReorderChatbotRulesDto,
  UpdateChatbotRuleDto,
} from '../dto/chatbot.dto';
import { ChatbotRuleResponseDto } from '../dto/chatbot-response.dto';
import { toChatbotRuleResponse } from '../mappers/chatbot.mapper';
import { ChatbotRulesRepository } from '../repositories/chatbot-rules.repository';
import { ChatbotsRepository } from '../repositories/chatbots.repository';
import { ChatbotAutoReplyService } from './chatbot-auto-reply.service';

@Injectable()
export class ChatbotRulesService {
  constructor(
    private readonly chatbotsRepository: ChatbotsRepository,
    private readonly rulesRepository: ChatbotRulesRepository,
    private readonly autoReply: ChatbotAutoReplyService,
    private readonly auditService: AuditService,
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
    actor: RequestUser,
  ): Promise<ChatbotRuleResponseDto> {
    await this.requireChatbot(businessId, chatbotId);
    const sortOrder =
      dto.sortOrder ??
      (await this.rulesRepository.getNextSortOrder(businessId, chatbotId));
    const rule = await this.rulesRepository.create({
      business: { connect: { id: businessId } },
      chatbot: { connect: { id: chatbotId } },
      triggerType: dto.triggerType,
      triggerText: dto.triggerText.trim(),
      responseText: dto.responseText.trim(),
      sortOrder,
      isActive: dto.isActive ?? true,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'chatbot_rule.created',
      entityType: 'ChatbotRule',
      entityId: rule.id,
      metadata: { chatbotId },
    });

    return toChatbotRuleResponse(rule);
  }

  async update(
    businessId: string,
    chatbotId: string,
    ruleId: string,
    dto: UpdateChatbotRuleDto,
    actor: RequestUser,
  ): Promise<ChatbotRuleResponseDto> {
    const rule = await this.requireRule(businessId, chatbotId, ruleId);
    const updated = await this.rulesRepository.update(rule.id, {
      ...(dto.triggerType !== undefined
        ? { triggerType: dto.triggerType }
        : {}),
      ...(dto.triggerText !== undefined
        ? { triggerText: dto.triggerText.trim() }
        : {}),
      ...(dto.responseText !== undefined
        ? { responseText: dto.responseText.trim() }
        : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'chatbot_rule.updated',
      entityType: 'ChatbotRule',
      entityId: updated.id,
      metadata: { chatbotId },
    });

    return toChatbotRuleResponse(updated);
  }

  async remove(
    businessId: string,
    chatbotId: string,
    ruleId: string,
    actor: RequestUser,
  ): Promise<void> {
    await this.requireRule(businessId, chatbotId, ruleId);
    await this.rulesRepository.delete(businessId, chatbotId, ruleId);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'chatbot_rule.deleted',
      entityType: 'ChatbotRule',
      entityId: ruleId,
      metadata: { chatbotId },
    });
  }

  async reorder(
    businessId: string,
    chatbotId: string,
    dto: ReorderChatbotRulesDto,
    actor: RequestUser,
  ): Promise<ChatbotRuleResponseDto[]> {
    await this.requireChatbot(businessId, chatbotId);
    const rules = await this.rulesRepository.reorder(
      businessId,
      chatbotId,
      dto.ruleIds,
    );
    if (rules.length === 0) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Invalid rule order',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'chatbot_rule.reordered',
      entityType: 'Chatbot',
      entityId: chatbotId,
      metadata: { ruleIds: dto.ruleIds },
    });

    return rules.map(toChatbotRuleResponse);
  }

  async preview(
    businessId: string,
    chatbotId: string,
    dto: PreviewChatbotRuleDto,
  ): Promise<{ type: 'reply' | 'handoff' | null; text: string | null }> {
    const chatbot = await this.requireChatbot(businessId, chatbotId);
    const rules = await this.rulesRepository.findActiveByChatbot(
      businessId,
      chatbotId,
    );
    const result = this.autoReply.resolveReply(chatbot, rules, dto.text, {
      botPaused: false,
      isOnline: true,
    });
    if (!result) {
      return { type: null, text: null };
    }
    return { type: result.type, text: result.text };
  }

  async exportRules(
    businessId: string,
    chatbotId: string,
  ): Promise<
    Array<{
      triggerType: string;
      triggerText: string;
      responseText: string;
      sortOrder: number;
      isActive: boolean;
    }>
  > {
    const rules = await this.list(businessId, chatbotId);
    return rules.map((rule) => ({
      triggerType: rule.triggerType,
      triggerText: rule.triggerText,
      responseText: rule.responseText,
      sortOrder: rule.sortOrder,
      isActive: rule.isActive,
    }));
  }

  async importRules(
    businessId: string,
    chatbotId: string,
    dto: ImportChatbotRulesDto,
    actor: RequestUser,
  ): Promise<ChatbotRuleResponseDto[]> {
    await this.requireChatbot(businessId, chatbotId);
    if (dto.replace) {
      const existing = await this.rulesRepository.findManyByChatbot(
        businessId,
        chatbotId,
      );
      for (const rule of existing) {
        await this.rulesRepository.delete(businessId, chatbotId, rule.id);
      }
    }

    const created: ChatbotRuleResponseDto[] = [];
    for (const [index, rule] of dto.rules.entries()) {
      const createdRule = await this.create(
        businessId,
        chatbotId,
        {
          ...rule,
          sortOrder: rule.sortOrder ?? index,
        },
        actor,
      );
      created.push(createdRule);
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'chatbot_rule.imported',
      entityType: 'Chatbot',
      entityId: chatbotId,
      metadata: { count: created.length, replace: dto.replace ?? false },
    });

    return created;
  }

  private async requireChatbot(businessId: string, chatbotId: string) {
    const chatbot = await this.chatbotsRepository.findById(
      businessId,
      chatbotId,
    );
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
