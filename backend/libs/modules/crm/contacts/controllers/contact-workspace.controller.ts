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
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import { AdjustContactWalletDto } from '../dto/adjust-contact-wallet.dto';
import {
  CreateContactAdjustmentDto,
  UpdateContactAdjustmentDto,
} from '../dto/contact-adjustment.dto';
import { ContactTimelineQueryDto } from '../dto/contact-timeline-query.dto';
import { ContactAdjustmentsService } from '../services/contact-adjustments.service';
import { ContactMembershipsService } from '../services/contact-memberships.service';
import { ContactPrintAppointmentsService } from '../services/contact-print-appointments.service';
import { ContactTimelineService } from '../services/contact-timeline.service';
import { ContactWalletService } from '../services/contact-wallet.service';

const MEMBER_ROLES = [
  BusinessMemberRole.OWNER,
  BusinessMemberRole.ADMIN,
  BusinessMemberRole.MEMBER,
] as const;

@ApiTags('contacts')
@ApiBearerAuth()
@Controller('contacts')
@UseGuards(BusinessRolesGuard)
export class ContactWorkspaceController {
  constructor(
    private readonly timelineService: ContactTimelineService,
    private readonly walletService: ContactWalletService,
    private readonly adjustmentsService: ContactAdjustmentsService,
    private readonly membershipsService: ContactMembershipsService,
    private readonly printAppointmentsService: ContactPrintAppointmentsService,
  ) {}

  @Get(':id/timeline')
  @BusinessRoles(...MEMBER_ROLES)
  getTimeline(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ContactTimelineQueryDto,
  ) {
    return this.timelineService.getTimeline(user.businessId!, id, query);
  }

  @Get(':id/wallet')
  @BusinessRoles(...MEMBER_ROLES)
  getWallet(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.walletService.getWallet(user.businessId!, id);
  }

  @Post(':id/wallet/adjust')
  @BusinessRoles(...MEMBER_ROLES)
  adjustWallet(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustContactWalletDto,
  ) {
    return this.walletService.adjustBalance(user.businessId!, id, dto, user);
  }

  @Get(':id/adjustments')
  @BusinessRoles(...MEMBER_ROLES)
  listAdjustments(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.adjustmentsService.list(user.businessId!, id);
  }

  @Post(':id/adjustments')
  @BusinessRoles(...MEMBER_ROLES)
  createAdjustment(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateContactAdjustmentDto,
  ) {
    return this.adjustmentsService.create(user.businessId!, id, dto, user);
  }

  @Patch(':id/adjustments/:adjustmentId')
  @BusinessRoles(...MEMBER_ROLES)
  updateAdjustment(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('adjustmentId', ParseUUIDPipe) adjustmentId: string,
    @Body() dto: UpdateContactAdjustmentDto,
  ) {
    return this.adjustmentsService.update(
      user.businessId!,
      id,
      adjustmentId,
      dto,
      user,
    );
  }

  @Delete(':id/adjustments/:adjustmentId')
  @BusinessRoles(...MEMBER_ROLES)
  removeAdjustment(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('adjustmentId', ParseUUIDPipe) adjustmentId: string,
  ) {
    return this.adjustmentsService.remove(
      user.businessId!,
      id,
      adjustmentId,
      user,
    );
  }

  @Get(':id/memberships')
  @BusinessRoles(...MEMBER_ROLES)
  getMemberships() {
    return this.membershipsService.getMemberships();
  }

  @Get(':id/appointments/print')
  @BusinessRoles(...MEMBER_ROLES)
  printAppointments(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.printAppointmentsService.getPrintableAppointments(
      user.businessId!,
      id,
    );
  }
}
