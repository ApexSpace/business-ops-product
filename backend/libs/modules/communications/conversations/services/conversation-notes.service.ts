import { HttpStatus, Injectable } from '@nestjs/common';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  ConversationNoteResponseDto,
  CreateConversationNoteDto,
} from '../dto/conversation-note.dto';
import { ConversationsRepository } from '../repositories/conversations.repository';
import { ConversationNotesRepository } from '../repositories/conversation-notes.repository';

@Injectable()
export class ConversationNotesService {
  constructor(
    private readonly conversationsRepository: ConversationsRepository,
    private readonly notesRepository: ConversationNotesRepository,
    private readonly auditService: AuditService,
  ) {}

  async list(
    businessId: string,
    conversationId: string,
  ): Promise<ConversationNoteResponseDto[]> {
    await this.requireConversation(businessId, conversationId);
    const notes = await this.notesRepository.findManyByConversation(
      businessId,
      conversationId,
    );
    return notes.map((note) => this.toResponse(note));
  }

  async create(
    businessId: string,
    conversationId: string,
    dto: CreateConversationNoteDto,
    actor: RequestUser,
  ): Promise<ConversationNoteResponseDto> {
    await this.requireConversation(businessId, conversationId);
    const note = await this.notesRepository.create({
      business: { connect: { id: businessId } },
      conversation: { connect: { id: conversationId } },
      author: { connect: { id: actor.id } },
      body: dto.body.trim(),
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'conversation.note.created',
      entityType: 'ConversationNote',
      entityId: note.id,
      metadata: { conversationId },
    });

    return this.toResponse(note);
  }

  private toResponse(note: {
    id: string;
    conversationId: string;
    body: string;
    createdAt: Date;
    updatedAt: Date;
    author: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
    };
  }): ConversationNoteResponseDto {
    return {
      id: note.id,
      conversationId: note.conversationId,
      body: note.body,
      author: {
        id: note.author.id,
        firstName: note.author.firstName,
        lastName: note.author.lastName,
        email: note.author.email,
      },
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  }

  private async requireConversation(
    businessId: string,
    conversationId: string,
  ) {
    const conversation = await this.conversationsRepository.findById(
      businessId,
      conversationId,
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
