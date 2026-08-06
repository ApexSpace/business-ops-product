import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { StaffPermission } from '@app/common/decorators/staff-permission.decorator';
import { RequireModule } from '@app/common/decorators/require-module.decorator';
import { ConfirmDeleteQueryDto } from '@app/common/dto/confirm-delete-query.dto';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { BusinessCapabilityGuard } from '@app/common/guards/business-capability.guard';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import {
  CreateOfferDiscountDto,
  CreateOfferDto,
  ListOffersQueryDto,
  OfferUsageReportQueryDto,
  ReorderOfferDiscountsDto,
  ReorderOffersDto,
  UpdateOfferDetailsDto,
  UpdateOfferDiscountDto,
} from '../dto/offer.dto';
import { OffersService } from '../services/offers.service';

const MEMBER_ROLES = [
  BusinessMemberRole.OWNER,
  BusinessMemberRole.ADMIN,
  BusinessMemberRole.MEMBER,
] as const;

@ApiTags('offers')
@ApiBearerAuth()
@Controller('offers')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('offers')
@StaffPermission('offers.access')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Get()
  @BusinessRoles(...MEMBER_ROLES)
  listOffers(
    @CurrentUser() user: RequestUser,
    @Query() query: ListOffersQueryDto,
  ) {
    return this.offersService.listOffers(user.businessId!, query);
  }

  @Get('usage-report')
  @BusinessRoles(...MEMBER_ROLES)
  getUsageReport(
    @CurrentUser() user: RequestUser,
    @Query() query: OfferUsageReportQueryDto,
  ) {
    return this.offersService.getUsageReport(user.businessId!, query);
  }

  @Post('reorder')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('offers.manage')
  reorder(@CurrentUser() user: RequestUser, @Body() dto: ReorderOffersDto) {
    return this.offersService.reorderOffers(user.businessId!, dto, user);
  }

  @Post()
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('offers.manage')
  createOffer(@CurrentUser() user: RequestUser, @Body() dto: CreateOfferDto) {
    return this.offersService.createOffer(user.businessId!, dto, user);
  }

  @Get(':id')
  @BusinessRoles(...MEMBER_ROLES)
  getOffer(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.offersService.getOffer(user.businessId!, id);
  }

  @Patch(':id/details')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('offers.manage')
  updateDetails(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOfferDetailsDto,
  ) {
    return this.offersService.updateOfferDetails(
      user.businessId!,
      id,
      dto,
      user,
    );
  }

  @Post(':id/enable')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('offers.manage')
  enableOffer(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.offersService.enableOffer(user.businessId!, id, user);
  }

  @Post(':id/disable')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('offers.manage')
  disableOffer(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.offersService.disableOffer(user.businessId!, id, user);
  }

  @Post(':id/duplicate')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('offers.manage')
  duplicateOffer(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.offersService.duplicateOffer(user.businessId!, id, user);
  }

  @Delete(':id')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('offers.manage')
  deleteOffer(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ConfirmDeleteQueryDto,
  ) {
    if (!query.confirm) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Pass confirm=true to delete this offer',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.offersService.deleteOffer(user.businessId!, id, user);
  }

  @Post(':id/discounts')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('offers.manage')
  addDiscount(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateOfferDiscountDto,
  ) {
    return this.offersService.addDiscount(user.businessId!, id, dto, user);
  }

  @Patch(':id/discounts/reorder')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('offers.manage')
  reorderDiscounts(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderOfferDiscountsDto,
  ) {
    return this.offersService.reorderDiscounts(user.businessId!, id, dto, user);
  }

  @Patch(':id/discounts/:discountId')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('offers.manage')
  updateDiscount(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('discountId', ParseUUIDPipe) discountId: string,
    @Body() dto: UpdateOfferDiscountDto,
  ) {
    return this.offersService.updateDiscount(
      user.businessId!,
      id,
      discountId,
      dto,
      user,
    );
  }

  @Delete(':id/discounts/:discountId')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('offers.manage')
  deleteDiscount(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('discountId', ParseUUIDPipe) discountId: string,
  ) {
    return this.offersService.deleteDiscount(
      user.businessId!,
      id,
      discountId,
      user,
    );
  }
}
