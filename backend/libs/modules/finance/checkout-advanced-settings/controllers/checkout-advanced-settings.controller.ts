import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import { UpdateCheckoutAdvancedSettingsDto } from '../dto/checkout-advanced-settings.dto';
import { CheckoutAdvancedSettingsService } from '../services/checkout-advanced-settings.service';

const READ_ROLES = [
  BusinessMemberRole.OWNER,
  BusinessMemberRole.ADMIN,
  BusinessMemberRole.MEMBER,
] as const;

const WRITE_ROLES = [
  BusinessMemberRole.OWNER,
  BusinessMemberRole.ADMIN,
] as const;

@ApiTags('checkout-advanced-settings')
@ApiBearerAuth()
@Controller('checkout-advanced-settings')
@UseGuards(BusinessRolesGuard)
export class CheckoutAdvancedSettingsController {
  constructor(
    private readonly checkoutAdvancedSettingsService: CheckoutAdvancedSettingsService,
  ) {}

  @Get()
  @BusinessRoles(...READ_ROLES)
  get(@CurrentUser() user: RequestUser) {
    return this.checkoutAdvancedSettingsService.get(user.businessId!);
  }

  @Patch()
  @BusinessRoles(...WRITE_ROLES)
  update(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateCheckoutAdvancedSettingsDto,
  ) {
    return this.checkoutAdvancedSettingsService.update(
      user.businessId!,
      dto,
      user,
    );
  }
}
