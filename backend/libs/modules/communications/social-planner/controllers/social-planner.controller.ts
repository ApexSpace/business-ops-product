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
import { ConfirmDeleteQueryDto } from '@app/common/dto/confirm-delete-query.dto';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { StaffPermission } from '@app/common/decorators/staff-permission.decorator';
import { RequireModule } from '@app/common/decorators/require-module.decorator';
import { BusinessCapabilityGuard } from '@app/common/guards/business-capability.guard';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import { CalendarQueryDto } from '../dto/calendar-query.dto';
import { CreateSocialPostDto } from '../dto/create-social-post.dto';
import { ListSocialPostsQueryDto } from '../dto/list-social-posts-query.dto';
import { ScheduleSocialPostDto } from '../dto/schedule-social-post.dto';
import { UpdateSocialPostDto } from '../dto/update-social-post.dto';
import { ValidateSocialPostDto } from '../dto/validate-social-post.dto';
import { SocialPostsService } from '../services/social-posts.service';
import { TikTokCreatorInfoService } from '../services/tiktok-creator-info.service';

@ApiTags('social-planner')
@ApiBearerAuth()
@Controller('social-planner')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('social_planner')
@StaffPermission('social_planner.access')
export class SocialPlannerController {
  constructor(
    private readonly socialPostsService: SocialPostsService,
    private readonly tikTokCreatorInfoService: TikTokCreatorInfoService,
  ) {}

  @Get('platform-schemas')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  platformSchemas() {
    return this.socialPostsService.getPlatformSchemas();
  }

  @Get('tiktok/creator-info')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  tiktokCreatorInfo(
    @CurrentUser() user: RequestUser,
    @Query('resourceId', ParseUUIDPipe) resourceId: string,
  ) {
    return this.tikTokCreatorInfoService.getCreatorInfo(
      user.businessId!,
      resourceId,
    );
  }

  @Get('calendar')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  calendar(
    @CurrentUser() user: RequestUser,
    @Query() query: CalendarQueryDto,
  ) {
    return this.socialPostsService.calendar(user.businessId!, query);
  }

  @Get('posts')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  list(
    @CurrentUser() user: RequestUser,
    @Query() query: ListSocialPostsQueryDto,
  ) {
    return this.socialPostsService.list(user.businessId!, query);
  }

  @Post('posts/validate')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  validate(
    @CurrentUser() user: RequestUser,
    @Body() dto: ValidateSocialPostDto,
  ) {
    return this.socialPostsService.validateCompose(user.businessId!, dto);
  }

  @Post('posts')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('social_planner.manage')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateSocialPostDto) {
    return this.socialPostsService.create(user.businessId!, dto, user);
  }

  @Get('posts/:id')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  get(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.socialPostsService.getById(user.businessId!, id);
  }

  @Patch('posts/:id')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('social_planner.manage')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSocialPostDto,
  ) {
    return this.socialPostsService.update(user.businessId!, id, dto, user);
  }

  @Delete('posts/:id')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('social_planner.manage')
  remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() _query: ConfirmDeleteQueryDto,
  ) {
    return this.socialPostsService.softDelete(user.businessId!, id, user);
  }

  @Post('posts/:id/schedule')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('social_planner.manage')
  schedule(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ScheduleSocialPostDto,
  ) {
    return this.socialPostsService.schedule(user.businessId!, id, dto, user);
  }

  @Post('posts/:id/publish-now')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('social_planner.manage')
  publishNow(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.socialPostsService.publishNow(user.businessId!, id, user);
  }

  @Post('posts/:id/cancel')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('social_planner.manage')
  cancel(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.socialPostsService.cancel(user.businessId!, id, user);
  }

  @Post('targets/:targetId/retry')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('social_planner.manage')
  retryTarget(
    @CurrentUser() user: RequestUser,
    @Param('targetId', ParseUUIDPipe) targetId: string,
  ) {
    return this.socialPostsService.retryTarget(
      user.businessId!,
      targetId,
      user,
    );
  }
}
