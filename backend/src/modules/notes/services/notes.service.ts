import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RequestUser } from '../../../common/decorators/current-user.decorator';
import { AppException } from '../../../common/exceptions/app.exception';
import { ErrorCode } from '../../../common/exceptions/error-code.enum';
import { htmlToPlainText } from '../../../common/utils/html-text.util';
import { getPaginationParams } from '../../../common/utils/pagination.util';
import { AuditService } from '../../audit/services/audit.service';
import { ContactRepository } from '../../contacts/repositories/contact.repository';
import { LeadRepository } from '../../leads/repositories/lead.repository';
import { CreateNoteDto } from '../dto/create-note.dto';
import { ListNotesQueryDto } from '../dto/list-notes-query.dto';
import { NoteResponseDto } from '../dto/note-response.dto';
import { UpdateNoteDto } from '../dto/update-note.dto';
import { toNoteResponse } from '../mappers/note.mapper';
import { NoteRepository } from '../repositories/note.repository';

@Injectable()
export class NotesService {
  constructor(
    private readonly noteRepository: NoteRepository,
    private readonly contactRepository: ContactRepository,
    private readonly leadRepository: LeadRepository,
    private readonly auditService: AuditService,
  ) {}

  async create(
    businessId: string,
    dto: CreateNoteDto,
    actor: RequestUser,
  ): Promise<NoteResponseDto> {
    this.assertHasLink(dto.contactId, dto.leadId);
    if (dto.contactId) {
      await this.assertContact(businessId, dto.contactId);
    }
    if (dto.leadId) {
      await this.assertLead(businessId, dto.leadId);
    }

    const description = dto.description ?? '';
    const note = await this.noteRepository.create(
      businessId,
      {
        contactId: dto.contactId ?? null,
        leadId: dto.leadId ?? null,
        title: dto.title.trim(),
        description,
        descriptionText: this.toDescriptionText(description),
      },
      actor.id,
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'note.created',
      entityType: 'Note',
      entityId: note.id,
    });

    return toNoteResponse(note);
  }

  async list(
    businessId: string,
    query: ListNotesQueryDto,
  ): Promise<{
    items: NoteResponseDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { page, limit, skip, take } = getPaginationParams(query);
    const { items, total } = await this.noteRepository.findMany(businessId, {
      skip,
      take,
      search: query.search?.trim() || undefined,
      contactId: query.contactId,
      leadId: query.leadId,
    });

    return {
      items: items.map(toNoteResponse),
      meta: { total, page, limit },
    };
  }

  async getById(businessId: string, id: string): Promise<NoteResponseDto> {
    const note = await this.noteRepository.findById(businessId, id);
    if (!note) {
      throw new AppException(
        ErrorCode.NOTE_NOT_FOUND,
        'Note not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return toNoteResponse(note);
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateNoteDto,
    actor: RequestUser,
  ): Promise<NoteResponseDto> {
    const existing = await this.noteRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.NOTE_NOT_FOUND,
        'Note not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const nextContactId =
      dto.contactId !== undefined ? dto.contactId : existing.contactId;
    const nextLeadId =
      dto.leadId !== undefined ? dto.leadId : existing.leadId;
    this.assertHasLink(nextContactId, nextLeadId);

    if (dto.contactId) {
      await this.assertContact(businessId, dto.contactId);
    }
    if (dto.leadId) {
      await this.assertLead(businessId, dto.leadId);
    }

    const data: Prisma.NoteUpdateInput = {};

    if (dto.contactId !== undefined) {
      data.contact =
        dto.contactId === null
          ? { disconnect: true }
          : { connect: { id: dto.contactId } };
    }
    if (dto.leadId !== undefined) {
      data.lead =
        dto.leadId === null
          ? { disconnect: true }
          : { connect: { id: dto.leadId } };
    }
    if (dto.title !== undefined) {
      data.title = dto.title.trim();
    }
    if (dto.description !== undefined) {
      data.description = dto.description;
      data.descriptionText = this.toDescriptionText(dto.description);
    }

    const note = await this.noteRepository.update(businessId, id, data);
    if (!note) {
      throw new AppException(
        ErrorCode.NOTE_NOT_FOUND,
        'Note not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'note.updated',
      entityType: 'Note',
      entityId: id,
    });

    return toNoteResponse(note);
  }

  async remove(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<NoteResponseDto> {
    const existing = await this.noteRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.NOTE_NOT_FOUND,
        'Note not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.noteRepository.softDelete(businessId, id);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'note.deleted',
      entityType: 'Note',
      entityId: id,
    });

    return toNoteResponse(existing);
  }

  private toDescriptionText(description: string): string | null {
    const text = htmlToPlainText(description);
    return text || null;
  }

  private assertHasLink(
    contactId?: string | null,
    leadId?: string | null,
  ): void {
    if (!contactId && !leadId) {
      throw new AppException(
        ErrorCode.LINK_REQUIRED,
        'Either contactId or leadId must be provided',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async assertContact(
    businessId: string,
    contactId: string,
  ): Promise<void> {
    const contact = await this.contactRepository.findById(
      businessId,
      contactId,
    );
    if (!contact) {
      throw new AppException(
        ErrorCode.CONTACT_NOT_FOUND,
        'Contact not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private async assertLead(businessId: string, leadId: string): Promise<void> {
    const lead = await this.leadRepository.findById(businessId, leadId);
    if (!lead) {
      throw new AppException(
        ErrorCode.LEAD_NOT_FOUND,
        'Lead not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }
}
