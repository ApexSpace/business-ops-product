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
  AdjustGiftCardBalanceDto,
  CreateGiftCardManualDto,
  CreateGiftCardPromotionDto,
  GiftCardReportDateQueryDto,
  ListGiftCardsQueryDto,
  ReorderGiftCardPromotionsDto,
  UpdateGiftCardDto,
  UpdateGiftCardSettingsArtworkDto,
  UpdateGiftCardSettingsOnlineSalesDto,
  UpdateGiftCardSettingsPreferencesDto,
  UpdateGiftCardPromotionDto,
} from '../dto/gift-card.dto';
import { GiftCardPromotionsService } from '../services/gift-card-promotions.service';
import { GiftCardReportsService } from '../services/gift-card-reports.service';
import { GiftCardOnlineCheckoutService } from '../services/gift-card-online-checkout.service';
import { GiftCardSettingsService } from '../services/gift-card-settings.service';
import { GiftCardsService } from '../services/gift-cards.service';

const MEMBER_ROLES = [
  BusinessMemberRole.OWNER,
  BusinessMemberRole.ADMIN,
  BusinessMemberRole.MEMBER,
] as const;

@ApiTags('gift-cards')
@ApiBearerAuth()
@Controller('gift-cards')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('payments')
@StaffPermission('gift_cards.access')
export class GiftCardsController {
  constructor(
    private readonly giftCardsService: GiftCardsService,
    private readonly settingsService: GiftCardSettingsService,
    private readonly promotionsService: GiftCardPromotionsService,
    private readonly reportsService: GiftCardReportsService,
    private readonly onlineCheckoutService: GiftCardOnlineCheckoutService,
  ) {}

  @Get('settings/online-sales-share')
  @BusinessRoles(...MEMBER_ROLES)
  getOnlineSalesShare(@CurrentUser() user: RequestUser) {
    return this.onlineCheckoutService.getOnlineSalesShare(user.businessId!);
  }

  @Get('settings')
  @BusinessRoles(...MEMBER_ROLES)
  getSettings(@CurrentUser() user: RequestUser) {
    return this.settingsService.getOrCreateSettings(user.businessId!);
  }

  @Patch('settings/online-sales')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('gift_cards.manage')
  updateOnlineSales(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateGiftCardSettingsOnlineSalesDto,
  ) {
    return this.settingsService.updateOnlineSales(user.businessId!, dto);
  }

  @Post('settings/artwork/upload')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('gift_cards.manage')
  artworkUpload(
    @CurrentUser() user: RequestUser,
    @Body() body: { contentType: string },
  ) {
    return this.settingsService.generateArtworkUploadUrl(
      user.businessId!,
      body.contentType ?? 'image/jpeg',
    );
  }

  @Patch('settings/artwork')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('gift_cards.manage')
  updateArtwork(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateGiftCardSettingsArtworkDto,
  ) {
    return this.settingsService.updateArtwork(user.businessId!, dto);
  }

  @Patch('settings/preferences')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('gift_cards.manage')
  updatePreferences(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateGiftCardSettingsPreferencesDto,
  ) {
    return this.settingsService.updatePreferences(user.businessId!, dto);
  }

  @Get('promotions')
  @BusinessRoles(...MEMBER_ROLES)
  listPromotions(@CurrentUser() user: RequestUser) {
    return this.promotionsService.findAll(user.businessId!);
  }

  @Post('promotions')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('gift_cards.manage')
  createPromotion(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateGiftCardPromotionDto,
  ) {
    return this.promotionsService.create(user.businessId!, dto);
  }

  @Patch('promotions/:id')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('gift_cards.manage')
  updatePromotion(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGiftCardPromotionDto,
  ) {
    return this.promotionsService.update(user.businessId!, id, dto);
  }

  @Delete('promotions/:id')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('gift_cards.manage')
  deletePromotion(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.promotionsService.delete(user.businessId!, id);
  }

  @Post('promotions/:id/reactivate')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('gift_cards.manage')
  reactivatePromotion(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { startDate?: string; endDate?: string | null },
  ) {
    return this.promotionsService.reactivate(
      user.businessId!,
      id,
      body.startDate,
      body.endDate,
    );
  }

  @Post('promotions/reorder')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('gift_cards.manage')
  reorderPromotions(
    @CurrentUser() user: RequestUser,
    @Body() dto: ReorderGiftCardPromotionsDto,
  ) {
    return this.promotionsService.reorder(user.businessId!, dto);
  }

  @Get('reports/usage')
  @BusinessRoles(...MEMBER_ROLES)
  usageReport(
    @CurrentUser() user: RequestUser,
    @Query() query: GiftCardReportDateQueryDto,
  ) {
    return this.reportsService.usageReport(user.businessId!, query);
  }

  @Get('reports/balances')
  @BusinessRoles(...MEMBER_ROLES)
  balancesReport(
    @CurrentUser() user: RequestUser,
    @Query() query: GiftCardReportDateQueryDto,
  ) {
    return this.reportsService.balancesReport(user.businessId!, query);
  }

  @Get('reports/sales')
  @BusinessRoles(...MEMBER_ROLES)
  salesReport(
    @CurrentUser() user: RequestUser,
    @Query() query: GiftCardReportDateQueryDto,
  ) {
    return this.reportsService.salesReport(user.businessId!, query);
  }

  @Get('reports/sales-details')
  @BusinessRoles(...MEMBER_ROLES)
  salesDetailsReport(
    @CurrentUser() user: RequestUser,
    @Query() query: GiftCardReportDateQueryDto,
  ) {
    return this.reportsService.salesDetailsReport(user.businessId!, query);
  }

  @Get('preview-number')
  @BusinessRoles(...MEMBER_ROLES)
  previewNumber(@CurrentUser() user: RequestUser) {
    return this.giftCardsService.previewNumber(user.businessId!);
  }

  @Get()
  @BusinessRoles(...MEMBER_ROLES)
  list(
    @CurrentUser() user: RequestUser,
    @Query() query: ListGiftCardsQueryDto,
  ) {
    return this.giftCardsService.findAll(user.businessId!, query);
  }

  @Post()
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('gift_cards.manage')
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateGiftCardManualDto,
  ) {
    return this.giftCardsService.createManual(user.businessId!, dto, user);
  }

  @Get(':id')
  @BusinessRoles(...MEMBER_ROLES)
  getOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.giftCardsService.findOne(user.businessId!, id);
  }

  @Patch(':id')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('gift_cards.manage')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGiftCardDto,
  ) {
    return this.giftCardsService.update(user.businessId!, id, dto, user);
  }

  @Post(':id/adjust-balance')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('gift_cards.manage')
  adjustBalance(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustGiftCardBalanceDto,
  ) {
    return this.giftCardsService.adjustBalance(user.businessId!, id, dto, user);
  }

  @Post(':id/void')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('gift_cards.manage')
  voidCard(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.giftCardsService.voidGiftCard(user.businessId!, id, user);
  }

  @Post(':id/send-digital')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('gift_cards.manage')
  sendDigital(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.giftCardsService.sendDigital(user.businessId!, id, user);
  }
}
