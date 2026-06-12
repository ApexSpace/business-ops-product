import { HttpStatus, Injectable } from '@nestjs/common';
import { FormStatus } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { slugify, withSlugSuffix } from '@app/common/utils/slug.util';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { CreateFormDto } from '../dto/create-form.dto';
import { DuplicateFormDto } from '../dto/duplicate-form.dto';
import {
  FormListQueryDto,
  type FormListSortField,
} from '../dto/form-list-query.dto';
import { FormEmbedResponseDto } from '../dto/form-embed.dto';
import { FormResponseDto } from '../dto/form-response.dto';
import { UpdateFormDto } from '../dto/update-form.dto';
import { FormEmbedService } from './form-embed.service';
import {
  toFormListItemResponse,
  toFormResponse,
} from '../mappers/form.mapper';
import { FormsRepository } from '../repositories/forms.repository';
import {
  defaultFormDefinition,
  definitionToJson,
  FormDefinitionView,
  parseFormDefinition,
  sanitizeFormDefinition,
} from '../utils/form-definition.util';
import { generateFormPublicKey } from '../utils/form-public-key.util';

@Injectable()
export class FormsService {
  constructor(
    private readonly formsRepository: FormsRepository,
    private readonly embedService: FormEmbedService,
  ) {}

  async list(businessId: string, query: FormListQueryDto) {
    const { page, limit, skip, take } = getPaginationParams(query);
    const sortBy = this.resolveSortBy(query.sortBy);
    const { items, total } = await this.formsRepository.findMany(businessId, {
      skip,
      take,
      search: query.search,
      status: query.status,
      sortBy,
      sortDir: query.sortDir ?? query.sortOrder,
    });

    return {
      items: items.map(toFormListItemResponse),
      meta: { total, page, limit },
    };
  }

  async get(businessId: string, id: string): Promise<FormResponseDto> {
    const form = await this.requireForm(businessId, id);
    return toFormResponse(form);
  }

  async getEmbedForForm(
    businessId: string,
    id: string,
  ): Promise<FormEmbedResponseDto> {
    const form = await this.requireForm(businessId, id);
    return this.embedService.buildEmbed({
      publicKey: form.publicKey,
      slug: form.slug,
      status: form.status,
    });
  }

  async create(
    businessId: string,
    dto: CreateFormDto,
    _actor: RequestUser,
  ): Promise<FormResponseDto> {
    const name = dto.name.trim();
    const definition: FormDefinitionView = dto.definition
      ? sanitizeFormDefinition({
          fields: dto.definition.fields,
          settings: dto.definition.settings,
        })
      : defaultFormDefinition(name);
    const slug = await this.resolveUniqueSlug(businessId, name);

    const form = await this.formsRepository.create({
      business: { connect: { id: businessId } },
      name,
      slug,
      publicKey: generateFormPublicKey(),
      status: FormStatus.DRAFT,
      definition: definitionToJson(definition),
    });

    return toFormResponse(form);
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateFormDto,
  ): Promise<FormResponseDto> {
    const existing = await this.requireForm(businessId, id);
    const data: Parameters<FormsRepository['update']>[1] = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }

    if (dto.definition !== undefined) {
      data.definition = definitionToJson(
        sanitizeFormDefinition({
          fields: dto.definition.fields,
          settings: dto.definition.settings,
        }),
      );
    }

    if (dto.status !== undefined) {
      Object.assign(data, this.statusTransitionData(dto.status));
    }

    if (Object.keys(data).length === 0) {
      return toFormResponse(existing);
    }

    const form = await this.formsRepository.update(id, data);
    return toFormResponse(form);
  }

  async remove(businessId: string, id: string): Promise<void> {
    await this.requireForm(businessId, id);
    const deleted = await this.formsRepository.softDelete(businessId, id);
    if (!deleted) {
      throw new AppException(
        ErrorCode.FORM_NOT_FOUND,
        'Form not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async duplicate(
    businessId: string,
    id: string,
    dto: DuplicateFormDto = {},
  ): Promise<FormResponseDto> {
    const source = await this.requireForm(businessId, id);
    const definition = parseFormDefinition(source);
    const copyName = dto.name?.trim() || `${source.name} (Copy)`;
    const slug = await this.resolveUniqueSlug(businessId, copyName);

    const copy = await this.formsRepository.create({
      business: { connect: { id: businessId } },
      name: copyName,
      slug,
      publicKey: generateFormPublicKey(),
      status: FormStatus.DRAFT,
      definition: definitionToJson(definition),
      metadata: source.metadata ?? undefined,
    });

    return toFormResponse(copy);
  }

  async publish(businessId: string, id: string): Promise<FormResponseDto> {
    await this.requireForm(businessId, id);
    const form = await this.formsRepository.update(id, {
      ...this.statusTransitionData(FormStatus.PUBLISHED),
    });
    return toFormResponse(form);
  }

  async moveToDraft(businessId: string, id: string): Promise<FormResponseDto> {
    await this.requireForm(businessId, id);
    const form = await this.formsRepository.update(id, {
      ...this.statusTransitionData(FormStatus.DRAFT),
    });
    return toFormResponse(form);
  }

  async archive(businessId: string, id: string): Promise<FormResponseDto> {
    await this.requireForm(businessId, id);
    const form = await this.formsRepository.update(id, {
      ...this.statusTransitionData(FormStatus.ARCHIVED),
    });
    return toFormResponse(form);
  }

  private statusTransitionData(status: FormStatus) {
    if (status === FormStatus.PUBLISHED) {
      return {
        status,
        publishedAt: new Date(),
        archivedAt: null,
      };
    }
    if (status === FormStatus.ARCHIVED) {
      return {
        status,
        archivedAt: new Date(),
      };
    }
    return {
      status: FormStatus.DRAFT,
      publishedAt: null,
      archivedAt: null,
    };
  }

  private resolveSortBy(sortBy?: string): FormListSortField {
    const allowed: FormListSortField[] = [
      'name',
      'updatedAt',
      'createdAt',
      'status',
    ];
    if (sortBy && allowed.includes(sortBy as FormListSortField)) {
      return sortBy as FormListSortField;
    }
    return 'updatedAt';
  }

  private async resolveUniqueSlug(
    businessId: string,
    name: string,
  ): Promise<string> {
    const base = slugify(name) || 'form';
    let suffix = 1;
    let candidate = base;

    while (await this.formsRepository.findBySlug(businessId, candidate)) {
      suffix += 1;
      candidate = withSlugSuffix(base, suffix);
    }

    return candidate;
  }

  private async requireForm(businessId: string, id: string) {
    const form = await this.formsRepository.findById(businessId, id);
    if (!form) {
      throw new AppException(
        ErrorCode.FORM_NOT_FOUND,
        'Form not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return form;
  }
}
