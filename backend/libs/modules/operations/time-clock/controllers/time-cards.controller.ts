import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import { BusinessCapabilityGuard } from '@app/common/guards/business-capability.guard';
import { RequireModule } from '@app/common/decorators/require-module.decorator';
import { ListTimeCardsQueryDto } from '../dto/list-time-cards-query.dto';
import { TimeCardDetailDto } from '../dto/time-card-response.dto';
import {
  CreateTimeCardDto,
  UpsertTimeCardBodyDto,
} from '../dto/upsert-time-card.dto';
import { TimeCardsService } from '../services/time-cards.service';

@ApiTags('time-cards')
@ApiBearerAuth()
@Controller('time-cards')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('time_clock')
export class TimeCardsController {
  constructor(private readonly timeCardsService: TimeCardsService) {}

  @Get()
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('time_cards.manage')
  list(
    @CurrentUser() user: RequestUser,
    @Query() query: ListTimeCardsQueryDto,
  ) {
    return this.timeCardsService.list(user.businessId!, query);
  }

  @Get(':id')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('time_cards.manage')
  get(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TimeCardDetailDto> {
    return this.timeCardsService.getById(user.businessId!, id);
  }

  @Post()
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('time_cards.manage')
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateTimeCardDto,
  ): Promise<TimeCardDetailDto> {
    return this.timeCardsService.create(user.businessId!, dto, user);
  }

  @Patch(':id')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('time_cards.manage')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertTimeCardBodyDto,
  ): Promise<TimeCardDetailDto> {
    return this.timeCardsService.update(user.businessId!, id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('time_cards.manage')
  remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.timeCardsService.remove(user.businessId!, id, user);
  }
}
