import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PlatformMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { PlatformRoles } from '@app/common/decorators/platform-roles.decorator';
import { PlatformRolesGuard } from '@app/common/guards/platform-roles.guard';
import {
  BusinessCapabilityDto,
  ExtendTrialDto,
  UpdateBusinessAccessDto,
  UpdateBusinessCapabilitiesDto,
} from '../dto/business-access.dto';
import {
  ActionReasonDto,
  BusinessAccessWithActionsDto,
  ChangePackageActionDto,
  ChangeSnapshotActionDto,
  MarkPaidDto,
  ManualAccessUpdateDto,
  PreviewActionDto,
  PreviewActionResultDto,
  ReactivateBusinessDto,
  SubscriptionActionResultDto,
} from '../dto/business-subscription-action.dto';
import {
  BusinessSubscriptionEventDetailDto,
  ListSubscriptionEventsQueryDto,
  SubscriptionEventsListDto,
} from '../dto/business-subscription-event.dto';
import {
  BusinessSubscriptionPaymentDto,
  ListSubscriptionPaymentsQueryDto,
  RecordPaymentDto,
  RefundPaymentDto,
  SubscriptionPaymentsListDto,
  VoidPaymentDto,
} from '../dto/business-subscription-payment.dto';
import { BusinessAccessService } from '../services/business-access.service';
import { BusinessSubscriptionActionService } from '../services/business-subscription-action.service';
import { BusinessSubscriptionEventService } from '../services/business-subscription-event.service';
import { BusinessSubscriptionPaymentService } from '../services/business-subscription-payment.service';

const ADMIN_ROLES = [
  PlatformMemberRole.SUPER_ADMIN,
  PlatformMemberRole.PLATFORM_ADMIN,
] as const;

const READ_ROLES = [
  PlatformMemberRole.SUPER_ADMIN,
  PlatformMemberRole.PLATFORM_ADMIN,
  PlatformMemberRole.SUPPORT,
] as const;

@ApiTags('platform')
@ApiBearerAuth()
@Controller('platform/businesses')
@UseGuards(PlatformRolesGuard)
export class PlatformBusinessAccessController {
  constructor(
    private readonly businessAccessService: BusinessAccessService,
    private readonly actionService: BusinessSubscriptionActionService,
    private readonly eventService: BusinessSubscriptionEventService,
    private readonly paymentService: BusinessSubscriptionPaymentService,
  ) {}

  @Get(':id/access')
  @PlatformRoles(...READ_ROLES)
  getAccess(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BusinessAccessWithActionsDto> {
    return this.businessAccessService.getAccess(id);
  }

  @Post(':id/access/preview-action')
  @PlatformRoles(...ADMIN_ROLES)
  previewAction(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PreviewActionDto,
  ): Promise<PreviewActionResultDto> {
    return this.actionService.previewAction(id, dto);
  }

  @Patch(':id/access')
  @PlatformRoles(...ADMIN_ROLES)
  applyManualAccessUpdate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ManualAccessUpdateDto,
    @CurrentUser() user: RequestUser,
  ): Promise<SubscriptionActionResultDto> {
    const { reason, notes, fields } = dto;
    return this.actionService.applyManualAccessUpdate(
      id,
      { ...(fields as UpdateBusinessAccessDto), reason, notes },
      user,
    );
  }

  @Post(':id/sync-capabilities-from-tier')
  @PlatformRoles(...ADMIN_ROLES)
  syncCapabilitiesFromTier(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<SubscriptionActionResultDto> {
    return this.actionService.syncCapabilities(id, user);
  }

  @Post(':id/access/mark-paid')
  @PlatformRoles(...ADMIN_ROLES)
  markPaid(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarkPaidDto,
    @CurrentUser() user: RequestUser,
  ): Promise<SubscriptionActionResultDto> {
    return this.actionService.markPaid(id, dto, user);
  }

  @Post(':id/access/record-payment')
  @PlatformRoles(...ADMIN_ROLES)
  recordPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordPaymentDto,
    @CurrentUser() user: RequestUser,
  ): Promise<SubscriptionActionResultDto> {
    return this.actionService.recordPayment(id, dto, user);
  }

  @Post(':id/access/extend-trial')
  @PlatformRoles(...ADMIN_ROLES)
  extendTrial(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExtendTrialDto,
    @CurrentUser() user: RequestUser,
  ): Promise<SubscriptionActionResultDto> {
    return this.actionService.extendTrial(id, dto, user);
  }

  @Post(':id/access/move-to-pending-payment')
  @PlatformRoles(...ADMIN_ROLES)
  moveToPendingPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActionReasonDto,
    @CurrentUser() user: RequestUser,
  ): Promise<SubscriptionActionResultDto> {
    return this.actionService.moveToPendingPayment(id, user, dto.reason);
  }

  @Post(':id/access/suspend')
  @PlatformRoles(...ADMIN_ROLES)
  suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActionReasonDto,
    @CurrentUser() user: RequestUser,
  ): Promise<SubscriptionActionResultDto> {
    return this.actionService.suspendBusiness(id, user, dto.reason);
  }

  @Post(':id/access/reactivate')
  @PlatformRoles(...ADMIN_ROLES)
  reactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReactivateBusinessDto,
    @CurrentUser() user: RequestUser,
  ): Promise<SubscriptionActionResultDto> {
    return this.actionService.reactivateBusiness(id, dto, user);
  }

  @Post(':id/access/cancel-subscription')
  @PlatformRoles(...ADMIN_ROLES)
  cancelSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActionReasonDto,
    @CurrentUser() user: RequestUser,
  ): Promise<SubscriptionActionResultDto> {
    return this.actionService.cancelSubscription(id, user, dto.reason);
  }

  @Post(':id/access/expire-trial')
  @PlatformRoles(...ADMIN_ROLES)
  expireTrial(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<SubscriptionActionResultDto> {
    return this.actionService.expireTrial(id, user);
  }

  @Post(':id/access/change-package')
  @PlatformRoles(...ADMIN_ROLES)
  changePackage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangePackageActionDto,
    @CurrentUser() user: RequestUser,
  ): Promise<SubscriptionActionResultDto> {
    return this.actionService.changePackage(id, dto, user);
  }

  @Post(':id/access/change-snapshot')
  @PlatformRoles(...ADMIN_ROLES)
  changeSnapshot(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeSnapshotActionDto,
    @CurrentUser() user: RequestUser,
  ): Promise<SubscriptionActionResultDto> {
    return this.actionService.changeSnapshot(id, dto, user);
  }

  @Get(':id/subscription-events')
  @PlatformRoles(...READ_ROLES)
  listSubscriptionEvents(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListSubscriptionEventsQueryDto,
  ): Promise<SubscriptionEventsListDto> {
    return this.eventService.listEvents(id, query);
  }

  @Get(':id/subscription-events/:eventId')
  @PlatformRoles(...READ_ROLES)
  getSubscriptionEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<BusinessSubscriptionEventDetailDto> {
    return this.eventService.getEvent(id, eventId);
  }

  @Get(':id/subscription-payments')
  @PlatformRoles(...READ_ROLES)
  listSubscriptionPayments(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListSubscriptionPaymentsQueryDto,
  ): Promise<SubscriptionPaymentsListDto> {
    return this.paymentService.listPayments(id, query);
  }

  @Post(':id/subscription-payments')
  @PlatformRoles(...ADMIN_ROLES)
  createSubscriptionPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordPaymentDto,
    @CurrentUser() user: RequestUser,
  ): Promise<SubscriptionActionResultDto> {
    return this.actionService.recordPayment(id, dto, user);
  }

  @Post(':id/subscription-payments/:paymentId/void')
  @PlatformRoles(...ADMIN_ROLES)
  voidSubscriptionPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Body() dto: VoidPaymentDto,
    @CurrentUser() user: RequestUser,
  ): Promise<BusinessSubscriptionPaymentDto> {
    return this.paymentService.voidPayment(paymentId, dto.reason, user);
  }

  @Post(':id/subscription-payments/:paymentId/refund')
  @PlatformRoles(...ADMIN_ROLES)
  refundSubscriptionPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Body() dto: RefundPaymentDto,
    @CurrentUser() user: RequestUser,
  ): Promise<SubscriptionActionResultDto> {
    return this.actionService.recordRefund(id, paymentId, dto, user);
  }

  @Get(':id/capabilities')
  @PlatformRoles(...READ_ROLES)
  listCapabilities(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BusinessCapabilityDto[]> {
    return this.businessAccessService.listCapabilities(id);
  }

  @Patch(':id/capabilities')
  @PlatformRoles(...ADMIN_ROLES)
  updateCapabilities(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBusinessCapabilitiesDto,
    @CurrentUser() user: RequestUser,
  ): Promise<BusinessCapabilityDto[]> {
    return this.businessAccessService.updateCapabilities(id, dto, user);
  }
}
