import { HttpStatus, Injectable } from '@nestjs/common';
import { RequestUser } from '../../../common/decorators/current-user.decorator';
import { AppException } from '../../../common/exceptions/app.exception';
import { ErrorCode } from '../../../common/exceptions/error-code.enum';
import { AuditService } from '../../audit/services/audit.service';
import { CreateTagDto } from '../dto/create-tag.dto';
import { TagResponseDto } from '../dto/tag-response.dto';
import { TagRepository } from '../repositories/tag.repository';

@Injectable()
export class ContactTagsService {
  constructor(
    private readonly tagRepository: TagRepository,
    private readonly auditService: AuditService,
  ) {}

  async list(businessId: string): Promise<TagResponseDto[]> {
    const tags = await this.tagRepository.findByBusinessId(businessId);
    return tags.map((tag) => this.toTagResponse(tag));
  }

  async create(
    businessId: string,
    dto: CreateTagDto,
    actor: RequestUser,
  ): Promise<TagResponseDto> {
    const name = dto.name.trim();
    const existing = await this.tagRepository.findByName(businessId, name);
    if (existing) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'A tag with this name already exists',
        HttpStatus.CONFLICT,
      );
    }

    const tag = await this.tagRepository.create(businessId, name);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'contact.tag_created',
      entityType: 'Tag',
      entityId: tag.id,
      metadata: { name: tag.name },
    });

    return this.toTagResponse(tag);
  }

  private toTagResponse(tag: {
    id: string;
    businessId: string;
    name: string;
    createdAt: Date;
  }): TagResponseDto {
    return {
      id: tag.id,
      businessId: tag.businessId,
      name: tag.name,
      createdAt: tag.createdAt,
    };
  }
}
