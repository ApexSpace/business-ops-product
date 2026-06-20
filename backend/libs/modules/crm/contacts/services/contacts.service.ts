import { HttpStatus, Inject, Injectable, forwardRef } from '@nestjs/common';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { CreateContactDto } from '../dto/create-contact.dto';
import { ContactResponseDto } from '../dto/contact-response.dto';
import { ListContactsQueryDto } from '../dto/list-contacts-query.dto';
import { UpdateContactDto } from '../dto/update-contact.dto';
import { toContactResponse } from '../mappers/contact.mapper';
import {
  ContactRepository,
  ContactWithTags,
} from '../repositories/contact.repository';
import { TagRepository } from '../repositories/tag.repository';
import {
  toContactCreateData,
  toContactUpdateData,
} from '../utils/contact-profile-data.util';
import { normalizePhoneKey } from '../utils/contact-profile.util';
import { WhatsAppParticipantSyncService } from '@app/modules/communications/conversations/services/whatsapp-participant-sync.service';
import { StorageService } from '@app/modules/storage/services/storage.service';

@Injectable()
export class ContactsService {
  constructor(
    private readonly contactRepository: ContactRepository,
    private readonly tagRepository: TagRepository,
    private readonly auditService: AuditService,
    @Inject(forwardRef(() => WhatsAppParticipantSyncService))
    private readonly whatsAppParticipantSyncService: WhatsAppParticipantSyncService,
    private readonly storageService: StorageService,
  ) {}

  async create(
    businessId: string,
    dto: CreateContactDto,
    actor: RequestUser,
  ): Promise<ContactResponseDto> {
    this.assertHasIdentity(dto);
    if (dto.avatarAssetId?.trim()) {
      await this.assertValidAvatarAsset(businessId, dto.avatarAssetId.trim());
    } else {
      this.assertValidAvatar(dto.avatarUrl);
    }

    const email = this.normalizeEmail(dto.email);
    const phoneKey = normalizePhoneKey(dto.phoneCountryCode, dto.phoneNumber);

    await this.assertNoDuplicates(businessId, email, phoneKey);

    const tagIds = dto.tagIds ?? [];
    await this.validateTagIds(businessId, tagIds);

    const contact = await this.contactRepository.create(
      businessId,
      toContactCreateData({
        ...dto,
        email: email ?? undefined,
      }),
      actor.id,
    );

    if (tagIds.length > 0) {
      await this.contactRepository.setTags(contact.id, tagIds);
      const tags = await this.tagRepository.findByIds(businessId, tagIds);
      for (const tagId of tagIds) {
        const tag = tags.find((t) => t.id === tagId);
        await this.auditService.log({
          actorUserId: actor.id,
          businessId,
          action: 'contact.tag_added',
          entityType: 'Contact',
          entityId: contact.id,
          metadata: { tagId, tagName: tag?.name },
        });
      }
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'contact.created',
      entityType: 'Contact',
      entityId: contact.id,
      metadata: {
        hasEmail: Boolean(email),
        hasPhone: Boolean(phoneKey),
      },
    });

    const withTags = await this.contactRepository.findById(
      businessId,
      contact.id,
    );
    return this.enrichContactResponse(businessId, withTags!);
  }

  async list(
    businessId: string,
    query: ListContactsQueryDto,
  ): Promise<{
    items: ContactResponseDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { page, limit, skip, take } = getPaginationParams(query);
    const { items, total } = await this.contactRepository.findMany(businessId, {
      skip,
      take,
      search: query.search?.trim() || undefined,
    });

    return {
      items: await Promise.all(
        items.map((item) => this.enrichContactResponse(businessId, item)),
      ),
      meta: { total, page, limit },
    };
  }

  async getById(businessId: string, id: string): Promise<ContactResponseDto> {
    const contact = await this.contactRepository.findById(businessId, id);
    if (!contact) {
      throw new AppException(
        ErrorCode.CONTACT_NOT_FOUND,
        'Contact not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return this.enrichContactResponse(businessId, contact);
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateContactDto,
    actor: RequestUser,
  ): Promise<ContactResponseDto> {
    const existing = await this.contactRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.CONTACT_NOT_FOUND,
        'Contact not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (dto.avatarAssetId !== undefined) {
      const trimmed = dto.avatarAssetId?.trim() ?? '';
      if (trimmed) {
        await this.assertValidAvatarAsset(businessId, trimmed);
      }
    } else if (dto.avatarUrl !== undefined) {
      this.assertValidAvatar(dto.avatarUrl);
    }

    const email =
      dto.email !== undefined ? this.normalizeEmail(dto.email) : existing.email;

    const phoneCountryCode =
      dto.phoneCountryCode !== undefined
        ? dto.phoneCountryCode
        : existing.phoneCountryCode;
    const phoneNumber =
      dto.phoneNumber !== undefined ? dto.phoneNumber : existing.phoneNumber;
    const phoneKey = normalizePhoneKey(phoneCountryCode, phoneNumber);

    if (
      dto.email !== undefined ||
      dto.phoneCountryCode !== undefined ||
      dto.phoneNumber !== undefined
    ) {
      await this.assertNoDuplicates(businessId, email, phoneKey, id);
    }

    if (dto.tagIds !== undefined) {
      await this.validateTagIds(businessId, dto.tagIds);
    }

    const phoneChanged =
      dto.phoneCountryCode !== undefined || dto.phoneNumber !== undefined;

    const profileDto = {
      ...dto,
      ...(dto.email !== undefined ? { email: email ?? undefined } : {}),
      firstName: dto.firstName ?? existing.firstName ?? undefined,
      lastName: dto.lastName ?? existing.lastName ?? undefined,
    };

    const updated = await this.contactRepository.update(
      businessId,
      id,
      toContactUpdateData(profileDto),
    );

    if (!updated) {
      throw new AppException(
        ErrorCode.CONTACT_NOT_FOUND,
        'Contact not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (dto.tagIds !== undefined) {
      const beforeTags = await this.contactRepository.findById(businessId, id);
      const previousTagIds = new Set(
        beforeTags?.tags?.map((entry) => entry.tag.id) ?? [],
      );
      await this.contactRepository.setTags(id, dto.tagIds);
      const addedTagIds = dto.tagIds.filter(
        (tagId) => !previousTagIds.has(tagId),
      );
      if (addedTagIds.length > 0) {
        const tags = await this.tagRepository.findByIds(
          businessId,
          addedTagIds,
        );
        for (const tagId of addedTagIds) {
          const tag = tags.find((t) => t.id === tagId);
          await this.auditService.log({
            actorUserId: actor.id,
            businessId,
            action: 'contact.tag_added',
            entityType: 'Contact',
            entityId: id,
            metadata: { tagId, tagName: tag?.name },
          });
        }
      }
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'contact.updated',
      entityType: 'Contact',
      entityId: id,
      metadata: { ...dto },
    });

    const withTags = await this.contactRepository.findById(businessId, id);
    if (phoneChanged && withTags) {
      await this.whatsAppParticipantSyncService.syncContactWhatsAppIdentity(
        businessId,
        withTags,
      );
    }
    return this.enrichContactResponse(businessId, withTags!);
  }

  async remove(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<ContactResponseDto> {
    const existing = await this.contactRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.CONTACT_NOT_FOUND,
        'Contact not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.contactRepository.softDelete(businessId, id);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'contact.deleted',
      entityType: 'Contact',
      entityId: id,
    });

    return this.enrichContactResponse(businessId, existing);
  }

  private assertHasIdentity(dto: CreateContactDto): void {
    const has =
      dto.firstName?.trim() ||
      dto.lastName?.trim() ||
      dto.displayName?.trim() ||
      dto.companyName?.trim() ||
      dto.email?.trim() ||
      dto.phoneNumber?.trim();
    if (!has) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Provide at least one of first name, last name, company, email, or phone',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private assertValidAvatar(avatarUrl?: string | null): void {
    if (!avatarUrl?.trim()) {
      return;
    }
    const value = avatarUrl.trim();
    if (value.startsWith('data:image/')) {
      return;
    }
    if (/^https?:\/\/.+/i.test(value)) {
      return;
    }
    throw new AppException(
      ErrorCode.BAD_REQUEST,
      'Avatar must be an image URL or uploaded image',
      HttpStatus.BAD_REQUEST,
    );
  }

  private async assertValidAvatarAsset(
    businessId: string,
    avatarAssetId: string,
  ): Promise<void> {
    const asset = await this.storageService.getFile(businessId, avatarAssetId);
    if (asset.category !== 'IMAGE') {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Avatar must be an image file',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (asset.status !== 'READY') {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Avatar upload is not ready yet',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async enrichContactResponse(
    businessId: string,
    contact: ContactWithTags,
  ): Promise<ContactResponseDto> {
    const response = toContactResponse(contact);
    if (!contact.avatarAssetId) {
      return response;
    }

    try {
      const { downloadUrl } = await this.storageService.getDownloadUrl(
        businessId,
        contact.avatarAssetId,
      );
      response.avatarUrl = downloadUrl;
    } catch {
      // Keep legacy avatarUrl fallback when signed URL resolution fails.
    }

    return response;
  }

  private normalizeEmail(email?: string): string | null {
    if (!email?.trim()) {
      return null;
    }
    return email.trim().toLowerCase();
  }

  private async assertNoDuplicates(
    businessId: string,
    email: string | null,
    phoneKey: string | null,
    excludeId?: string,
  ): Promise<void> {
    if (email) {
      const existing = await this.contactRepository.findByEmail(
        businessId,
        email,
        excludeId,
      );
      if (existing) {
        throw new AppException(
          ErrorCode.CONTACT_DUPLICATE_EMAIL,
          'A contact with this email already exists',
          HttpStatus.CONFLICT,
        );
      }
    }

    if (phoneKey) {
      const existing = await this.contactRepository.findByPhoneKey(
        businessId,
        phoneKey,
        excludeId,
      );
      if (existing) {
        throw new AppException(
          ErrorCode.CONTACT_DUPLICATE_PHONE,
          'A contact with this phone already exists',
          HttpStatus.CONFLICT,
        );
      }
    }
  }

  private async validateTagIds(
    businessId: string,
    tagIds: string[],
  ): Promise<void> {
    if (tagIds.length === 0) {
      return;
    }
    const tags = await this.tagRepository.findByIds(businessId, tagIds);
    if (tags.length !== tagIds.length) {
      throw new AppException(
        ErrorCode.TAG_NOT_FOUND,
        'One or more tags not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }
}
