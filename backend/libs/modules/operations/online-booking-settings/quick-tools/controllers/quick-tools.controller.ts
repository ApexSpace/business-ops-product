import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { RequireModule } from '@app/common/decorators/require-module.decorator';
import { BusinessCapabilityGuard } from '@app/common/guards/business-capability.guard';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import {
  RemoveNotWorkingApplyResponseDto,
  RemoveNotWorkingDto,
  RemoveNotWorkingPreviewResponseDto,
  SetNotWorkingApplyResponseDto,
  SetNotWorkingDto,
  SetNotWorkingPreviewResponseDto,
} from '../dto/quick-tools.dto';
import { QuickToolsService } from '../services/quick-tools.service';

@ApiTags('quick-tools')
@ApiBearerAuth()
@Controller('quick-tools')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('appointments')
export class QuickToolsController {
  constructor(private readonly quickToolsService: QuickToolsService) {}

  @Post('set-not-working/preview')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  previewSetNotWorking(
    @CurrentUser() user: RequestUser,
    @Body() dto: SetNotWorkingDto,
  ): Promise<SetNotWorkingPreviewResponseDto> {
    return this.quickToolsService.previewSetNotWorking(user.businessId!, dto);
  }

  @Post('set-not-working')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  applySetNotWorking(
    @CurrentUser() user: RequestUser,
    @Body() dto: SetNotWorkingDto,
  ): Promise<SetNotWorkingApplyResponseDto> {
    return this.quickToolsService.applySetNotWorking(
      user.businessId!,
      dto,
      user,
    );
  }

  @Post('remove-not-working/preview')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  previewRemoveNotWorking(
    @CurrentUser() user: RequestUser,
    @Body() dto: RemoveNotWorkingDto,
  ): Promise<RemoveNotWorkingPreviewResponseDto> {
    return this.quickToolsService.previewRemoveNotWorking(
      user.businessId!,
      dto,
    );
  }

  @Post('remove-not-working')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  applyRemoveNotWorking(
    @CurrentUser() user: RequestUser,
    @Body() dto: RemoveNotWorkingDto,
  ): Promise<RemoveNotWorkingApplyResponseDto> {
    return this.quickToolsService.applyRemoveNotWorking(
      user.businessId!,
      dto,
      user,
    );
  }
}
