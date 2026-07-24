import {
  Body,
  Controller,
  Delete,
  Get,
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
import { BusinessCapabilityGuard } from '@app/common/guards/business-capability.guard';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import {
  AddCheckoutProductDto,
  AddCheckoutServiceDto,
  AddGiftCardLineDto,
  AddPackageLineDto,
  AddWalletDepositDto,
  CreateCheckoutDto,
  UpdateCheckoutDto,
  UpdateCheckoutLineItemDto,
} from '../dto/checkout.dto';
import {
  CloseCheckoutDto,
  ListCheckoutsQueryDto,
} from '../dto/checkout-query.dto';
import { CheckoutsService } from '../services/checkouts.service';

@ApiTags('checkouts')
@ApiBearerAuth()
@Controller('checkouts')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('sales')
@StaffPermission(
  'sales.access',
  'sales.view_own',
  'sales.view_all',
  'sales.view_on_calendar',
  'sales.checkout',
)
export class CheckoutsController {
  constructor(private readonly checkoutsService: CheckoutsService) {}

  @Get()
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('sales.view_own', 'sales.view_all', 'sales.access')
  list(
    @CurrentUser() user: RequestUser,
    @Query() query: ListCheckoutsQueryDto,
  ) {
    return this.checkoutsService.list(user.businessId!, query, user);
  }

  @Get('picker/services')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  listServices(@CurrentUser() user: RequestUser) {
    return this.checkoutsService.listServicesForPicker(user.businessId!);
  }

  @Get('picker/services/:serviceId/staff')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  listServiceStaff(
    @CurrentUser() user: RequestUser,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
  ) {
    return this.checkoutsService.listStaffForServicePicker(
      user.businessId!,
      serviceId,
    );
  }

  @Post()
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('sales.checkout')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateCheckoutDto) {
    return this.checkoutsService.create(user.businessId!, dto, user);
  }

  @Get(':id')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  get(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.checkoutsService.getById(user.businessId!, id, user);
  }

  @Patch(':id')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('sales.checkout')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCheckoutDto,
  ) {
    return this.checkoutsService.update(user.businessId!, id, dto, user);
  }

  @Delete(':id')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  @StaffPermission('sales.checkout')
  voidCheckout(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.checkoutsService.voidCheckout(user.businessId!, id, user);
  }

  @Post(':id/items/service')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('sales.checkout')
  addService(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddCheckoutServiceDto,
  ) {
    return this.checkoutsService.addService(user.businessId!, id, dto, user);
  }

  @Post(':id/items/product')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('sales.checkout')
  addProduct(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddCheckoutProductDto,
  ) {
    return this.checkoutsService.addProduct(user.businessId!, id, dto, user);
  }

  @Get('picker/products')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  listProducts(
    @CurrentUser() user: RequestUser,
    @Query('search') search?: string,
  ) {
    return this.checkoutsService.listProductsForPicker(
      user.businessId!,
      search,
      user,
    );
  }

  @Post(':id/items/wallet-deposit')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('sales.checkout')
  addWalletDeposit(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddWalletDepositDto,
  ) {
    return this.checkoutsService.addWalletDeposit(
      user.businessId!,
      id,
      dto,
      user,
    );
  }

  @Post(':id/gift-card')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('sales.checkout')
  addGiftCardLine(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddGiftCardLineDto,
  ) {
    return this.checkoutsService.addGiftCardLine(
      user.businessId!,
      id,
      dto,
      user,
    );
  }

  @Post(':id/package')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('sales.checkout')
  addPackageLine(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddPackageLineDto,
  ) {
    return this.checkoutsService.addPackageLine(
      user.businessId!,
      id,
      dto,
      user,
    );
  }

  @Patch(':id/items/:lineId')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('sales.checkout')
  updateLineItem(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lineId', ParseUUIDPipe) lineId: string,
    @Body() dto: UpdateCheckoutLineItemDto,
  ) {
    return this.checkoutsService.updateLineItem(
      user.businessId!,
      id,
      lineId,
      dto,
      user,
    );
  }

  @Delete(':id/items/:lineId')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('sales.checkout')
  removeLineItem(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lineId', ParseUUIDPipe) lineId: string,
  ) {
    return this.checkoutsService.removeLineItem(
      user.businessId!,
      id,
      lineId,
      user,
    );
  }

  @Post(':id/apply-offer')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('sales.checkout')
  applyOffer(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { offerId: string },
  ) {
    return this.checkoutsService.applyOffer(
      user.businessId!,
      id,
      dto.offerId,
      user,
    );
  }

  @Post(':id/remove-offer')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('sales.checkout')
  removeOffer(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { offerId: string },
  ) {
    return this.checkoutsService.removeAppliedOffer(
      user.businessId!,
      id,
      dto.offerId,
      user,
    );
  }

  @Get('picker/offers')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  listStaffOffers(@CurrentUser() user: RequestUser) {
    return this.checkoutsService.listStaffOffersForPicker(user.businessId!);
  }

  @Post(':id/close')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('sales.checkout')
  close(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloseCheckoutDto,
  ) {
    return this.checkoutsService.close(user.businessId!, id, dto, user);
  }
}
