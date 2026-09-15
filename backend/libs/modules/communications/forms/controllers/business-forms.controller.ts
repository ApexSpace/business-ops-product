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
import { RequireCapability } from '@app/common/decorators/require-capability.decorator';
import { RequireModule } from '@app/common/decorators/require-module.decorator';
import { BusinessCapabilityGuard } from '@app/common/guards/business-capability.guard';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import { CreateFormDto } from '../dto/create-form.dto';
import { DuplicateFormDto } from '../dto/duplicate-form.dto';
import { FormListQueryDto } from '../dto/form-list-query.dto';
import { UpdateFormDto } from '../dto/update-form.dto';
import { FormSubmissionListQueryDto } from '../dto/form-submission-list-query.dto';
import { FormSubmissionsService } from '../services/form-submissions.service';
import { FormsService } from '../services/forms.service';

@ApiTags('forms')
@ApiBearerAuth()
@Controller('forms')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('forms')
@StaffPermission('forms.view_own_submissions', 'forms.view_all_submissions', 'forms.manage_templates')
export class BusinessFormsController {
  constructor(
    private readonly formsService: FormsService,
    private readonly formSubmissionsService: FormSubmissionsService,
  ) {}

  @Get()
  @RequireCapability('forms.list')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  list(@CurrentUser() user: RequestUser, @Query() query: FormListQueryDto) {
    return this.formsService.list(user.businessId!, query);
  }

  @Post()
  @RequireCapability('forms.create')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('forms.manage_templates')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateFormDto) {
    return this.formsService.create(user.businessId!, dto, user);
  }

  @Get(':id')
  @RequireCapability('forms.list')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  get(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.formsService.get(user.businessId!, id);
  }

  @Get(':id/embed')
  @RequireCapability('forms.list')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  embed(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.formsService.getEmbedForForm(user.businessId!, id);
  }

  @Get(':id/submissions')
  @RequireCapability('forms.list')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  listSubmissions(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: FormSubmissionListQueryDto,
  ) {
    return this.formSubmissionsService.list(user.businessId!, id, query);
  }

  @Delete(':id/submissions/:submissionId')
  @RequireCapability('forms.delete')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('forms.view_all_submissions', 'forms.manage_templates')
  removeSubmission(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
  ) {
    return this.formSubmissionsService.remove(
      user.businessId!,
      id,
      submissionId,
    );
  }

  @Patch(':id')
  @RequireCapability('forms.edit')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('forms.manage_templates')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFormDto,
  ) {
    return this.formsService.update(user.businessId!, id, dto);
  }

  @Delete(':id')
  @RequireCapability('forms.delete')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('forms.manage_templates')
  remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.formsService.remove(user.businessId!, id);
  }

  @Post(':id/duplicate')
  @RequireCapability('forms.create')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('forms.manage_templates')
  duplicate(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DuplicateFormDto,
  ) {
    return this.formsService.duplicate(user.businessId!, id, dto);
  }

  @Post(':id/publish')
  @RequireCapability('forms.edit')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('forms.manage_templates')
  publish(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.formsService.publish(user.businessId!, id);
  }

  @Post(':id/move-to-draft')
  @RequireCapability('forms.edit')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('forms.manage_templates')
  moveToDraft(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.formsService.moveToDraft(user.businessId!, id);
  }

  @Post(':id/archive')
  @RequireCapability('forms.edit')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  @StaffPermission('forms.manage_templates')
  archive(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.formsService.archive(user.businessId!, id);
  }
}
