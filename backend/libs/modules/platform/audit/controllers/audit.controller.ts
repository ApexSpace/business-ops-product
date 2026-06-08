import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PlatformMemberRole } from '@prisma/client';
import { PaginationQueryDto } from '@app/common/dto/pagination-query.dto';
import { PlatformRoles } from '@app/common/decorators/platform-roles.decorator';
import { PlatformRolesGuard } from '@app/common/guards/platform-roles.guard';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { AuditLogResponseDto } from '../dto/audit-log-response.dto';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('platform/businesses/:businessId/audit-logs')
@UseGuards(PlatformRolesGuard)
@PlatformRoles(
  PlatformMemberRole.SUPER_ADMIN,
  PlatformMemberRole.PLATFORM_ADMIN,
  PlatformMemberRole.SUPPORT,
)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async list(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Query() query: PaginationQueryDto,
    @Query('action') action?: string,
  ): Promise<{ items: AuditLogResponseDto[]; meta: { total: number; page: number; limit: number } }> {
    const { page, limit, skip } = getPaginationParams(query);
    const { items, total } = await this.auditService.findByBusinessId(
      businessId,
      skip,
      limit,
      { action },
    );
    return {
      items: items.map((log) => ({
        id: log.id,
        actorUserId: log.actorUserId,
        actorEmail: log.actor?.email ?? null,
        businessId: log.businessId,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        metadata: log.metadata as Record<string, unknown> | null,
        createdAt: log.createdAt,
      })),
      meta: { total, page, limit },
    };
  }
}
