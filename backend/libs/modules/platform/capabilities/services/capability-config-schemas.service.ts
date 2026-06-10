import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  CapabilityConfigSchemaResponseDto,
  CreateCapabilityConfigSchemaDto,
  UpdateCapabilityConfigSchemaDto,
} from '../dto';
import { toCapabilityConfigSchema } from '../mappers/capability.mapper';
import { CapabilityRepository } from '../repositories/capability.repository';
import { CapabilityValidationService } from './capability-validation.service';
import { CapabilitiesService } from './capabilities.service';

@Injectable()
export class CapabilityConfigSchemasService {
  constructor(
    private readonly repository: CapabilityRepository,
    private readonly capabilitiesService: CapabilitiesService,
    private readonly validation: CapabilityValidationService,
    private readonly auditService: AuditService,
  ) {}

  async list(
    capabilityId: string,
  ): Promise<CapabilityConfigSchemaResponseDto[]> {
    await this.capabilitiesService.requireCapability(capabilityId);
    const items = await this.repository.findConfigSchemas(capabilityId);
    return items.map(toCapabilityConfigSchema);
  }

  async create(
    capabilityId: string,
    dto: CreateCapabilityConfigSchemaDto,
    actor: RequestUser,
  ): Promise<CapabilityConfigSchemaResponseDto> {
    await this.capabilitiesService.requireCapability(capabilityId);
    this.validation.validateKey(dto.schemaKey, 'schemaKey');
    const schemaJson = this.validation.validateJsonSchema(dto.schemaJson);
    const defaultConfigJson = dto.defaultConfigJson
      ? this.validation.validateJsonSchema(
          dto.defaultConfigJson,
          'defaultConfigJson',
        )
      : undefined;

    const schema = await this.repository.createConfigSchema({
      capability: { connect: { id: capabilityId } },
      schemaKey: dto.schemaKey,
      name: dto.name.trim(),
      description: dto.description?.trim(),
      schemaJson: schemaJson as Prisma.InputJsonValue,
      defaultConfigJson: defaultConfigJson as Prisma.InputJsonValue | undefined,
      metadata: dto.metadata as Prisma.InputJsonValue | undefined,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.capability.config_schema.created',
      entityType: 'CapabilityConfigSchema',
      entityId: schema.id,
      metadata: { capabilityId, schemaKey: schema.schemaKey },
    });

    return toCapabilityConfigSchema(schema);
  }

  async update(
    capabilityId: string,
    schemaId: string,
    dto: UpdateCapabilityConfigSchemaDto,
    actor: RequestUser,
  ): Promise<CapabilityConfigSchemaResponseDto> {
    await this.requireSchema(capabilityId, schemaId);

    const schemaJson = dto.schemaJson
      ? this.validation.validateJsonSchema(dto.schemaJson)
      : undefined;
    const defaultConfigJson =
      dto.defaultConfigJson !== undefined
        ? this.validation.validateJsonSchema(
            dto.defaultConfigJson,
            'defaultConfigJson',
          )
        : undefined;

    const updated = await this.repository.updateConfigSchema(schemaId, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description?.trim() }
        : {}),
      ...(schemaJson !== undefined
        ? { schemaJson: schemaJson as Prisma.InputJsonValue }
        : {}),
      ...(defaultConfigJson !== undefined
        ? { defaultConfigJson: defaultConfigJson as Prisma.InputJsonValue }
        : {}),
      ...(dto.metadata !== undefined
        ? { metadata: dto.metadata as Prisma.InputJsonValue }
        : {}),
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.capability.config_schema.updated',
      entityType: 'CapabilityConfigSchema',
      entityId: schemaId,
      metadata: { capabilityId, changes: dto },
    });

    return toCapabilityConfigSchema(updated);
  }

  async remove(
    capabilityId: string,
    schemaId: string,
    actor: RequestUser,
  ): Promise<void> {
    const schema = await this.requireSchema(capabilityId, schemaId);
    await this.repository.softDeleteConfigSchema(schemaId);

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.capability.config_schema.archived',
      entityType: 'CapabilityConfigSchema',
      entityId: schemaId,
      metadata: { capabilityId, schemaKey: schema.schemaKey },
    });
  }

  private async requireSchema(capabilityId: string, schemaId: string) {
    const schema = await this.repository.findConfigSchemaById(
      capabilityId,
      schemaId,
    );
    if (!schema) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Config schema not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return schema;
  }
}
