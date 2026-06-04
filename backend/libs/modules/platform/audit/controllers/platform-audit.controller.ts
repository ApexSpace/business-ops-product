import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PlatformMemberRole } from '@prisma/client';
import { PlatformRoles } from '@app/common/decorators/platform-roles.decorator';
import { PaginationQueryDto } from '@app/common/dto/pagination-query.dto';
import { PlatformRolesGuard } from '@app/common/guards/platform-roles.guard';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { AuditLogResponseDto } from '../dto/audit-log-response.dto';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';

@ApiTags('platform')
@ApiBearerAuth()
@Controller('platform/audit-logs')
@UseGuards(PlatformRolesGuard)
@PlatformRoles(
  PlatformMemberRole.SUPER_ADMIN,
  PlatformMemberRole.PLATFORM_ADMIN,
  PlatformMemberRole.SUPPORT,
)
export class PlatformAuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async list(
    @Query() query: PaginationQueryDto,
    @Query('businessId') businessId?: string,
    @Query('action') action?: string,
  ): Promise<{
    items: AuditLogResponseDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { page, limit, skip } = getPaginationParams(query);
    const { items, total } = await this.auditService.findAll(skip, limit, {
      businessId,
      action,
    });

    return {
      items: items.map((log) => ({
        id: log.id,
        actorUserId: log.actorUserId,
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
