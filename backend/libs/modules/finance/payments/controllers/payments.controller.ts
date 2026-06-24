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
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { ConfirmDeleteQueryDto } from '@app/common/dto/confirm-delete-query.dto';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { RequireModule } from '@app/common/decorators/require-module.decorator';
import { BusinessCapabilityGuard } from '@app/common/guards/business-capability.guard';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { ListPaymentsQueryDto } from '../dto/list-payments-query.dto';
import { UpdatePaymentDto } from '../dto/update-payment.dto';
import { PaymentsOverviewDto } from '../dto/payments-overview.dto';
import { StripeConnectContextService } from '@app/modules/integrations/integrations/stripe/services/stripe-connect-context.service';
import {
  CollectPaymentDto,
  CollectPaymentResponseDto,
} from '../dto/collect-payment.dto';
import {
  ContactPaymentMethodListResponseDto,
  CreateSetupIntentResponseDto,
} from '../dto/contact-payment-method.dto';
import { StripeConnectContextResponseDto } from '../dto/stripe-connect-context.dto';
import { ContactPaymentMethodsService } from '../services/contact-payment-methods.service';
import { PaymentOrchestratorService } from '../orchestration/payment-orchestrator.service';
import { PaymentsOverviewService } from '@app/modules/finance/payments/services/payments-overview.service';
import { PaymentsService } from '@app/modules/finance/payments/services/payments.service';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paymentsOverviewService: PaymentsOverviewService,
    private readonly paymentOrchestrator: PaymentOrchestratorService,
    private readonly stripeConnectContext: StripeConnectContextService,
    private readonly contactPaymentMethodsService: ContactPaymentMethodsService,
  ) {}

  @Post()
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(user.businessId!, dto, user);
  }

  @Get()
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  list(@CurrentUser() user: RequestUser, @Query() query: ListPaymentsQueryDto) {
    return this.paymentsService.list(user.businessId!, query);
  }

  @Get('overview')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  getOverview(@CurrentUser() user: RequestUser): Promise<PaymentsOverviewDto> {
    return this.paymentsOverviewService.getOverview(user.businessId!);
  }

  @Get('stripe-context')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  async getStripeContext(
    @CurrentUser() user: RequestUser,
  ): Promise<StripeConnectContextResponseDto> {
    return this.stripeConnectContext.getContextForBusiness(user.businessId!);
  }

  @Post('collect')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  async collect(
    @CurrentUser() user: RequestUser,
    @Body() dto: CollectPaymentDto,
  ): Promise<CollectPaymentResponseDto> {
    return this.paymentOrchestrator.collectPayment({
      businessId: user.businessId!,
      payableType: dto.payableType,
      payableId: dto.payableId,
      tenders: dto.tenders,
      channel: dto.channel ?? 'STAFF_POS',
      stripeMode: dto.stripeMode ?? 'EMBEDDED',
      actorUserId: user.id,
    });
  }

  @Get('contact-methods/:contactId')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  listContactPaymentMethods(
    @CurrentUser() user: RequestUser,
    @Param('contactId', ParseUUIDPipe) contactId: string,
  ): Promise<ContactPaymentMethodListResponseDto> {
    return this.contactPaymentMethodsService.list(user.businessId!, contactId);
  }

  @Post('contact-methods/:contactId/setup-intent')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  createContactSetupIntent(
    @CurrentUser() user: RequestUser,
    @Param('contactId', ParseUUIDPipe) contactId: string,
  ): Promise<CreateSetupIntentResponseDto> {
    return this.contactPaymentMethodsService.createSetupIntent(
      user.businessId!,
      contactId,
    );
  }

  @Delete('contact-methods/:contactId/:methodId')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  detachContactPaymentMethod(
    @CurrentUser() user: RequestUser,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Param('methodId', ParseUUIDPipe) methodId: string,
  ) {
    return this.contactPaymentMethodsService.detach(
      user.businessId!,
      contactId,
      methodId,
    );
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
    return this.paymentsService.getById(user.businessId!, id);
  }

  @Patch(':id')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePaymentDto,
  ) {
    return this.paymentsService.update(user.businessId!, id, dto, user);
  }

  @Post(':id/refund')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  refund(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentsService.refund(user.businessId!, id, user);
  }

  @Delete(':id')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @ApiQuery({
    name: 'confirm',
    required: true,
    type: Boolean,
    description: 'Must be true to confirm deletion',
  })
  remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() _query: ConfirmDeleteQueryDto,
  ) {
    return this.paymentsService.remove(user.businessId!, id, user);
  }
}
