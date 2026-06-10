import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import { SnapshotContextDto } from '../dto/snapshot.dto';
import { SnapshotContextService } from '../services/snapshot-context.service';

@ApiTags('business')
@ApiBearerAuth()
@Controller('businesses')
@UseGuards(BusinessRolesGuard)
export class BusinessSnapshotContextController {
  constructor(
    private readonly snapshotContextService: SnapshotContextService,
  ) {}

  @Get('current/snapshot-context')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  getSnapshotContext(
    @CurrentUser() user: RequestUser,
  ): Promise<SnapshotContextDto> {
    return this.snapshotContextService.getForBusiness(user.businessId!);
  }
}
