import { Injectable } from '@nestjs/common';
import {
  ConversationChannel,
  ConversationStatus,
  Prisma,
} from '@prisma/client';
import { SYSTEM_AUDIT_ACTOR_SENTINEL } from '@app/modules/platform/audit/constants/audit.constants';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { WEBCHAT_PROVIDER_KEY } from '@app/modules/communications/chatbots/utils/chatbot-public-key.util';
import { ConversationsRepository } from '@app/modules/communications/conversations/repositories/conversations.repository';
import { ConversationRealtimeService } from '@app/modules/communications/conversations/services/conversation-realtime.service';

type FormFieldLike = {
  type?: string;
  name?: string;
};

@Injectable()
export class FormSubmissionConversationBridgeService {
  constructor(
    private readonly conversationsRepository: ConversationsRepository,
    private readonly auditService: AuditService,
    private readonly realtime: ConversationRealtimeService,
  ) {}

  async maybeCreateConversationFromSubmission(params: {
    businessId: string;
    formId: string;
    formName: string;
    submissionId: string;
    fields: FormFieldLike[];
    data: Record<string, unknown>;
    enabled: boolean;
  }): Promise<string | null> {
    if (!params.enabled) {
      return null;
    }

    const contact = this.extractContactFields(params.fields, params.data);
    const preview = this.buildPreview(params.data);

    const externalId = `form:${params.submissionId}`;
    const conversation = await this.conversationsRepository.create({
      business: { connect: { id: params.businessId } },
      channel: ConversationChannel.WEBCHAT,
      providerKey: WEBCHAT_PROVIDER_KEY,
      externalConversationId: externalId,
      externalParticipantId: externalId,
      title: contact.name || contact.email || 'Form submission',
      status: ConversationStatus.OPEN,
      unreadCount: 1,
      lastMessagePreview: preview,
      lastMessageAt: new Date(),
      metadata: {
        source: 'form_submission',
        formId: params.formId,
        formName: params.formName,
        submissionId: params.submissionId,
        contactEmail: contact.email,
        contactPhone: contact.phone,
        contactName: contact.name,
      },
    });

    await this.auditService.log({
      actorUserId: SYSTEM_AUDIT_ACTOR_SENTINEL,
      businessId: params.businessId,
      action: 'conversation.created',
      entityType: 'Conversation',
      entityId: conversation.id,
      metadata: {
        channel: ConversationChannel.WEBCHAT,
        source: 'form_submission',
        formId: params.formId,
        submissionId: params.submissionId,
      },
    });

    await this.realtime.publishConversationUpdated(params.businessId, {
      conversationId: conversation.id,
      channel: ConversationChannel.WEBCHAT,
    });

    return conversation.id;
  }

  private extractContactFields(
    fields: FormFieldLike[],
    data: Record<string, unknown>,
  ): { name: string | null; email: string | null; phone: string | null } {
    let name: string | null = null;
    let email: string | null = null;
    let phone: string | null = null;

    for (const field of fields) {
      const key = typeof field.name === 'string' ? field.name : null;
      if (!key) continue;
      const value = data[key];
      const text = typeof value === 'string' ? value.trim() : '';
      if (!text) continue;

      if (field.type === 'email' && !email) email = text;
      if (field.type === 'phone' && !phone) phone = text;
      if ((field.type === 'text' || field.type === 'name') && !name) {
        name = text;
      }
    }

    return { name, email, phone };
  }

  private buildPreview(data: Record<string, unknown>): string {
    const first = Object.values(data).find(
      (value) => typeof value === 'string' && value.trim(),
    );
    return typeof first === 'string'
      ? first.trim().slice(0, 500)
      : 'New form submission';
  }
}
