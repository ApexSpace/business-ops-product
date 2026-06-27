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
import { RequireModule } from '@app/common/decorators/require-module.decorator';
import { ConfirmDeleteQueryDto } from '@app/common/dto/confirm-delete-query.dto';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { BusinessCapabilityGuard } from '@app/common/guards/business-capability.guard';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import {
  CreateOfferDiscountDto,
  CreateOfferDto,
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
@RequireModule('payments')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Get()
  @BusinessRoles(...MEMBER_ROLES)
  listOffers(
    @CurrentUser() user: RequestUser,
    @Query('search') search?: string,
  ) {
    return this.offersService.listOffers(user.businessId!, search);
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
  reorder(
    @CurrentUser() user: RequestUser,
    @Body() dto: ReorderOffersDto,
  ) {
    return this.offersService.reorderOffers(user.businessId!, dto, user);
  }

  @Post()
  @BusinessRoles(...MEMBER_ROLES)
  createOffer(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateOfferDto,
  ) {
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
  enableOffer(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.offersService.enableOffer(user.businessId!, id, user);
  }

  @Post(':id/disable')
  @BusinessRoles(...MEMBER_ROLES)
  disableOffer(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.offersService.disableOffer(user.businessId!, id, user);
  }

  @Post(':id/duplicate')
  @BusinessRoles(...MEMBER_ROLES)
  duplicateOffer(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.offersService.duplicateOffer(user.businessId!, id, user);
  }

  @Delete(':id')
  @BusinessRoles(...MEMBER_ROLES)
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
  addDiscount(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateOfferDiscountDto,
  ) {
    return this.offersService.addDiscount(user.businessId!, id, dto, user);
  }

  @Patch(':id/discounts/reorder')
  @BusinessRoles(...MEMBER_ROLES)
  reorderDiscounts(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderOfferDiscountsDto,
  ) {
    return this.offersService.reorderDiscounts(
      user.businessId!,
      id,
      dto,
      user,
    );
  }

  @Patch(':id/discounts/:discountId')
  @BusinessRoles(...MEMBER_ROLES)
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
