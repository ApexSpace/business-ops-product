import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { MetaApiClient } from '../../integrations/meta/services/meta-api-client';
import {
  CreateWhatsAppTemplateDto,
  CreateWhatsAppTemplateWithHeaderDto,
  ListWhatsAppTemplatesQueryDto,
  UpdateWhatsAppTemplateDto,
} from '../dto/whatsapp-template.dto';
import {
  WHATSAPP_TEMPLATE_BUTTON_TYPES,
  WHATSAPP_TEMPLATE_CATEGORIES,
  WHATSAPP_TEMPLATE_HEADER_FORMATS,
  WHATSAPP_TEMPLATE_LANGUAGES,
} from '../constants/template.constants';
import { WhatsAppTemplateRepository } from '../repositories/whatsapp-template.repository';
import {
  buildMetaCreatePayload,
  buildMetaTemplateComponents,
  extractBodyPreview,
  normalizeTemplateName,
  type TemplateComponentInput,
} from '../utils/template-builder.util';
import { buildHeaderComponent } from '../utils/template-header.util';
import {
  mapMetaTemplateToUpsert,
  mapTemplateDetail,
  mapTemplateListItem,
} from '../utils/template-mapper.util';
import { getTemplatePolicy } from '../utils/template-policy.util';
import { mapMetaTemplateStatus } from '../utils/template-status.util';
import { WhatsAppBusinessContextService } from './whatsapp-business-context.service';
import { WhatsAppMetaUploadService } from './whatsapp-meta-upload.service';

@Injectable()
export class WhatsAppTemplateService {
  constructor(
    private readonly templateRepository: WhatsAppTemplateRepository,
    private readonly businessContextService: WhatsAppBusinessContextService,
    private readonly metaUploadService: WhatsAppMetaUploadService,
    private readonly metaApiClient: MetaApiClient,
  ) {}

  getOptions() {
    return {
      languages: [...WHATSAPP_TEMPLATE_LANGUAGES],
      categories: [...WHATSAPP_TEMPLATE_CATEGORIES],
      buttonTypes: [...WHATSAPP_TEMPLATE_BUTTON_TYPES],
      headerFormats: [...WHATSAPP_TEMPLATE_HEADER_FORMATS],
    };
  }

  async list(businessId: string, query: ListWhatsAppTemplatesQueryDto) {
    const { page, limit, skip, take } = getPaginationParams(query);
    const sortBy = this.resolveSortBy(query.sortBy);
    const { items, total } = await this.templateRepository.findMany(
      businessId,
      {
        skip,
        take,
        search: query.search,
        status: query.status,
        category: query.category,
        sortBy,
        sortDir: query.sortOrder ?? 'desc',
      },
    );

    return {
      items: items.map(mapTemplateListItem),
      meta: { total, page, limit },
    };
  }

  async listApproved(businessId: string) {
    const items = await this.templateRepository.findApproved(businessId);
    return items.map(mapTemplateListItem);
  }

  async getById(businessId: string, id: string) {
    const template = await this.requireTemplate(businessId, id);
    return mapTemplateDetail(template);
  }

  async create(
    businessId: string,
    dto: CreateWhatsAppTemplateDto,
    actor: RequestUser,
  ) {
    const context = await this.businessContextService.requireConnectedContext(
      businessId,
    );
    const payload = buildMetaCreatePayload({
      name: dto.name,
      language: dto.language,
      category: dto.category,
      components: dto.components as unknown as TemplateComponentInput[],
      parameterFormat: dto.parameterFormat,
    });

    const meta = await this.metaApiClient.createMessageTemplate(
      context.wabaId,
      context.accessToken,
      payload,
    );

    const components = payload.components as Prisma.InputJsonValue;
    const template = await this.templateRepository.create({
      businessId,
      wabaId: context.wabaId,
      name: normalizeTemplateName(dto.name),
      language: dto.language.trim(),
      category: dto.category,
      status: mapMetaTemplateStatus(meta.status),
      parameterFormat: dto.parameterFormat?.trim() || 'POSITIONAL',
      metaTemplateId: meta.id ?? null,
      components,
      bodyPreview:
        extractBodyPreview(
          dto.components as unknown as TemplateComponentInput[],
        ) || null,
      rejectionReason: meta.rejected_reason ?? null,
      qualityScore: meta.quality_score as Prisma.InputJsonValue,
      submittedAt: new Date(),
      lastSyncedAt: new Date(),
      createdByUserId: actor.id ?? null,
    });

    return mapTemplateDetail(template);
  }

  async createWithHeaderSample(
    businessId: string,
    dto: CreateWhatsAppTemplateWithHeaderDto,
    file:
      | {
          buffer: Buffer;
          mimetype: string;
          originalname: string;
        }
      | undefined,
    actor: RequestUser,
  ) {
    if (!file?.buffer?.length) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'Header sample file is required.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const context = await this.businessContextService.requireConnectedContext(
      businessId,
    );
    const headerHandle = await this.metaUploadService.uploadHeaderSample({
      accessToken: context.accessToken,
      buffer: file.buffer,
      mimeType: file.mimetype,
      filename: file.originalname,
    });

    const components: TemplateComponentInput[] = dto.components
      .filter((component) => component.type?.toUpperCase() !== 'HEADER')
      .map((component) => component as unknown as TemplateComponentInput);
    const headerComponent = buildHeaderComponent({
      format: dto.headerFormat,
      headerHandle,
    });
    components.unshift(headerComponent);

    return this.create(
      businessId,
      {
        ...dto,
        components:
          components as unknown as CreateWhatsAppTemplateDto['components'],
      },
      actor,
    );
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateWhatsAppTemplateDto,
  ) {
    const template = await this.requireTemplate(businessId, id);
    const policy = getTemplatePolicy(template.status);
    if (!policy.canEdit) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        policy.editBlockedReason ?? 'This template cannot be edited.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const context = await this.businessContextService.requireConnectedContext(
      businessId,
    );
    const nextComponents = dto.components ?? (template.components as Record<string, unknown>[]);
    const metaPayload: Record<string, unknown> = {};

    if (dto.category) {
      metaPayload.category = dto.category;
    }
    if (dto.components) {
      metaPayload.components = buildMetaTemplateComponents(
        dto.components as unknown as TemplateComponentInput[],
      );
    }
    if (dto.parameterFormat) {
      metaPayload.parameter_format = dto.parameterFormat;
    }

    let metaStatus = template.status;
    let rejectionReason = template.rejectionReason;
    let metaTemplateId = template.metaTemplateId;

    if (template.metaTemplateId && Object.keys(metaPayload).length > 0) {
      const meta = await this.metaApiClient.updateMessageTemplate(
        template.metaTemplateId,
        context.accessToken,
        metaPayload,
      );
      metaStatus = mapMetaTemplateStatus(meta.status);
      rejectionReason = meta.rejected_reason ?? null;
      metaTemplateId = meta.id ?? metaTemplateId;
    }

    const updated = await this.templateRepository.update(businessId, id, {
      category: dto.category ?? template.category,
      components: buildMetaTemplateComponents(
        nextComponents as Record<string, unknown>[],
      ) as Prisma.InputJsonValue,
      parameterFormat: dto.parameterFormat ?? template.parameterFormat,
      status: metaStatus,
      rejectionReason,
      metaTemplateId,
      bodyPreview:
        extractBodyPreview(nextComponents as Record<string, unknown>[]) ||
        template.bodyPreview,
      submittedAt: new Date(),
      lastSyncedAt: new Date(),
    });

    return mapTemplateDetail(updated);
  }

  async syncAll(businessId: string) {
    const context = await this.businessContextService.requireConnectedContext(
      businessId,
    );
    const remoteTemplates = await this.metaApiClient.listMessageTemplates(
      context.wabaId,
      context.accessToken,
    );

    const syncedAt = new Date();
    for (const remote of remoteTemplates) {
      const mapped = mapMetaTemplateToUpsert({
        businessId,
        wabaId: context.wabaId,
        meta: remote,
      });
      await this.templateRepository.upsertByNameLanguage({
        ...mapped,
        components: mapped.components as Prisma.InputJsonValue,
        lastSyncedAt: syncedAt,
        qualityScore: mapped.qualityScore as Prisma.InputJsonValue,
      });
    }

    return { syncedCount: remoteTemplates.length };
  }

  async syncOne(businessId: string, id: string) {
    const template = await this.requireTemplate(businessId, id);
    const context = await this.businessContextService.requireConnectedContext(
      businessId,
    );

    const remote = template.metaTemplateId
      ? await this.metaApiClient.getMessageTemplate(
          template.metaTemplateId,
          context.accessToken,
        )
      : (
          await this.metaApiClient.listMessageTemplates(
            context.wabaId,
            context.accessToken,
          )
        ).find(
          (item) =>
            item.name === template.name && item.language === template.language,
        );

    if (!remote) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Template was not found on Meta.',
        HttpStatus.NOT_FOUND,
      );
    }

    const mapped = mapMetaTemplateToUpsert({
      businessId,
      wabaId: context.wabaId,
      meta: remote,
    });
    const updated = await this.templateRepository.upsertByNameLanguage({
      ...mapped,
      components: mapped.components as Prisma.InputJsonValue,
      lastSyncedAt: new Date(),
      qualityScore: mapped.qualityScore as Prisma.InputJsonValue,
    });

    return mapTemplateDetail(updated);
  }

  async delete(businessId: string, id: string) {
    const template = await this.requireTemplate(businessId, id);
    const policy = getTemplatePolicy(template.status);
    if (!policy.canDelete) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'This template cannot be deleted in its current status.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const context = await this.businessContextService.requireConnectedContext(
      businessId,
    );

    await this.metaApiClient.deleteMessageTemplate(
      context.wabaId,
      context.accessToken,
      template.name,
    );
    await this.templateRepository.delete(businessId, id);
  }

  private async requireTemplate(businessId: string, id: string) {
    const template = await this.templateRepository.findById(businessId, id);
    if (!template) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'WhatsApp template not found.',
        HttpStatus.NOT_FOUND,
      );
    }
    return template;
  }

  private resolveSortBy(
    sortBy: ListWhatsAppTemplatesQueryDto['sortBy'],
  ): 'name' | 'updatedAt' | 'createdAt' | 'status' {
    if (
      sortBy === 'name' ||
      sortBy === 'updatedAt' ||
      sortBy === 'createdAt' ||
      sortBy === 'status'
    ) {
      return sortBy;
    }
    return 'updatedAt';
  }
}
