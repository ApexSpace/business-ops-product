import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../../common/decorators/current-user.decorator';
import { BusinessRoles } from '../../../common/decorators/business-roles.decorator';
import { BusinessRolesGuard } from '../../../common/guards/business-roles.guard';
import { CreateTagDto } from '../dto/create-tag.dto';
import { ContactTagsService } from '../services/contact-tags.service';

@ApiTags('contact-tags')
@ApiBearerAuth()
@Controller('contact-tags')
@UseGuards(BusinessRolesGuard)
export class ContactTagsController {
  constructor(private readonly contactTagsService: ContactTagsService) {}

  @Get()
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  list(@CurrentUser() user: RequestUser) {
    return this.contactTagsService.list(user.businessId!);
  }

  @Post()
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateTagDto) {
    return this.contactTagsService.create(user.businessId!, dto, user);
  }
}
