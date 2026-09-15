import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { ListSocialCommentsQueryDto } from '../dto/list-social-comments-query.dto';
import {
  CommentActionQueryDto,
  MarkSocialCommentsReadDto,
  ReplySocialCommentDto,
} from '../dto/social-comment-action.dto';
import { SocialCommentsService } from '../services/social-comments.service';

@ApiTags('social-planner')
@ApiBearerAuth()
@Controller('social-planner/comments')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('social_planner')
@StaffPermission('social_planner.access')
export class SocialPlannerCommentsController {
  constructor(private readonly socialCommentsService: SocialCommentsService) {}

  @Get()
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  list(
    @CurrentUser() user: RequestUser,
    @Query() query: ListSocialCommentsQueryDto,
  ) {
    return this.socialCommentsService.listForBusiness(user.businessId!, query);
  }

  @Post('mark-read')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('social_planner.manage')
  markRead(
    @CurrentUser() user: RequestUser,
    @Body() dto: MarkSocialCommentsReadDto,
  ) {
    if (dto.ids?.length) {
      return this.socialCommentsService.markRead(user.businessId!, dto.ids);
    }
    return this.socialCommentsService.markAllRead(user.businessId!, {
      providerKey: dto.providerKey,
      socialPostId: dto.socialPostId,
    });
  }

  @Post(':commentId/reply')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('social_planner.manage')
  reply(
    @CurrentUser() user: RequestUser,
    @Param('commentId') commentId: string,
    @Body() dto: ReplySocialCommentDto,
  ) {
    return this.socialCommentsService.reply(
      user.businessId!,
      commentId,
      dto.providerKey,
      dto.message,
      dto.socialPostTargetId,
    );
  }

  @Post(':commentId/like')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('social_planner.manage')
  like(
    @CurrentUser() user: RequestUser,
    @Param('commentId') commentId: string,
    @Query() query: CommentActionQueryDto,
  ) {
    return this.socialCommentsService.like(
      user.businessId!,
      commentId,
      query.providerKey,
      query.socialPostTargetId,
    );
  }

  @Delete(':commentId')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('social_planner.manage')
  remove(
    @CurrentUser() user: RequestUser,
    @Param('commentId') commentId: string,
    @Query() query: CommentActionQueryDto,
  ) {
    return this.socialCommentsService.delete(
      user.businessId!,
      commentId,
      query.providerKey,
      query.socialPostTargetId,
    );
  }
}
