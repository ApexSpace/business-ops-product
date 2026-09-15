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
import { RequireModule } from '@app/common/decorators/require-module.decorator';
import { ConfirmDeleteQueryDto } from '@app/common/dto/confirm-delete-query.dto';
import { BusinessCapabilityGuard } from '@app/common/guards/business-capability.guard';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import {
  CreateAppointmentAutomatedMessageDto,
  CreateAppointmentAutomatedMessageTriggerDto,
  UpdateAppointmentAutomatedMessageDto,
  UpdateAppointmentAutomatedMessageSettingsDto,
  UpdateAppointmentAutomatedMessageTriggerDto,
} from '../dto/appointment-automated-messages.dto';
import { AppointmentAutomatedMessagesService } from '../services/appointment-automated-messages.service';

const READ_ROLES = [
  BusinessMemberRole.OWNER,
  BusinessMemberRole.ADMIN,
  BusinessMemberRole.MEMBER,
] as const;

const WRITE_ROLES = [
  BusinessMemberRole.OWNER,
  BusinessMemberRole.ADMIN,
] as const;

@ApiTags('appointment-automated-messages')
@ApiBearerAuth()
@Controller('appointment-automated-messages')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('appointments')
export class AppointmentAutomatedMessagesController {
  constructor(
    private readonly automatedMessagesService: AppointmentAutomatedMessagesService,
  ) {}

  @Get(':eventType/message-catalog')
  @BusinessRoles(...READ_ROLES)
  catalog(@Param('eventType') eventType: string) {
    return this.automatedMessagesService.getCatalog(eventType);
  }

  @Get(':eventType')
  @BusinessRoles(...READ_ROLES)
  get(
    @CurrentUser() user: RequestUser,
    @Param('eventType') eventType: string,
  ) {
    return this.automatedMessagesService.get(user.businessId!, eventType);
  }

  @Patch(':eventType')
  @BusinessRoles(...WRITE_ROLES)
  updateSettings(
    @CurrentUser() user: RequestUser,
    @Param('eventType') eventType: string,
    @Body() dto: UpdateAppointmentAutomatedMessageSettingsDto,
  ) {
    return this.automatedMessagesService.updateSettings(
      user.businessId!,
      eventType,
      dto,
      user,
    );
  }

  @Post(':eventType/triggers')
  @BusinessRoles(...WRITE_ROLES)
  createTrigger(
    @CurrentUser() user: RequestUser,
    @Param('eventType') eventType: string,
    @Body() dto: CreateAppointmentAutomatedMessageTriggerDto,
  ) {
    return this.automatedMessagesService.createTrigger(
      user.businessId!,
      eventType,
      dto,
      user,
    );
  }

  @Patch('triggers/:id')
  @BusinessRoles(...WRITE_ROLES)
  updateTrigger(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentAutomatedMessageTriggerDto,
  ) {
    return this.automatedMessagesService.updateTrigger(
      user.businessId!,
      id,
      dto,
      user,
    );
  }

  @Delete('triggers/:id')
  @BusinessRoles(...WRITE_ROLES)
  async deleteTrigger(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ConfirmDeleteQueryDto,
  ) {
    void query;
    await this.automatedMessagesService.deleteTrigger(
      user.businessId!,
      id,
      user,
    );
  }

  @Post('triggers/:id/messages')
  @BusinessRoles(...WRITE_ROLES)
  createMessage(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAppointmentAutomatedMessageDto,
  ) {
    return this.automatedMessagesService.createMessage(
      user.businessId!,
      id,
      dto,
      user,
    );
  }

  @Patch('messages/:id')
  @BusinessRoles(...WRITE_ROLES)
  updateMessage(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentAutomatedMessageDto,
  ) {
    return this.automatedMessagesService.updateMessage(
      user.businessId!,
      id,
      dto,
      user,
    );
  }

  @Delete('messages/:id')
  @BusinessRoles(...WRITE_ROLES)
  async deleteMessage(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ConfirmDeleteQueryDto,
  ) {
    void query;
    await this.automatedMessagesService.deleteMessage(
      user.businessId!,
      id,
      user,
    );
  }
}
