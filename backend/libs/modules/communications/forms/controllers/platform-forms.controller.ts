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
import { PlatformMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { PlatformRoles } from '@app/common/decorators/platform-roles.decorator';
import { PlatformRolesGuard } from '@app/common/guards/platform-roles.guard';
import { InternalBusinessService } from '@app/modules/platform/business/services/internal-business.service';
import { CreateFormDto } from '../dto/create-form.dto';
import { DuplicateFormDto } from '../dto/duplicate-form.dto';
import { FormListQueryDto } from '../dto/form-list-query.dto';
import { UpdateFormDto } from '../dto/update-form.dto';
import { FormSubmissionListQueryDto } from '../dto/form-submission-list-query.dto';
import { FormSubmissionsService } from '../services/form-submissions.service';
import { FormsService } from '../services/forms.service';
import { withoutConversationOnSubmit } from '../utils/platform-form-definition.util';

const PLATFORM_FORMS_ROLES = [
  PlatformMemberRole.SUPER_ADMIN,
  PlatformMemberRole.PLATFORM_ADMIN,
  PlatformMemberRole.SUPPORT,
] as const;

@ApiTags('platform-forms')
@ApiBearerAuth()
@Controller('platform/forms')
@UseGuards(PlatformRolesGuard)
@PlatformRoles(...PLATFORM_FORMS_ROLES)
export class PlatformFormsController {
  constructor(
    private readonly formsService: FormsService,
    private readonly formSubmissionsService: FormSubmissionsService,
    private readonly internalBusiness: InternalBusinessService,
  ) {}

  @Get()
  async list(@Query() query: FormListQueryDto) {
    const businessId = await this.internalBusiness.getId();
    return this.formsService.list(businessId, query);
  }

  @Post()
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateFormDto) {
    const businessId = await this.internalBusiness.getId();
    return this.formsService.create(
      businessId,
      withoutConversationOnSubmit(dto),
      user,
    );
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    const businessId = await this.internalBusiness.getId();
    return this.formsService.get(businessId, id);
  }

  @Get(':id/embed')
  async embed(@Param('id', ParseUUIDPipe) id: string) {
    const businessId = await this.internalBusiness.getId();
    return this.formsService.getEmbedForForm(businessId, id);
  }

  @Get(':id/submissions')
  async listSubmissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: FormSubmissionListQueryDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.formSubmissionsService.list(businessId, id, query);
  }

  @Delete(':id/submissions/:submissionId')
  async removeSubmission(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.formSubmissionsService.remove(businessId, id, submissionId);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFormDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.formsService.update(
      businessId,
      id,
      withoutConversationOnSubmit(dto),
    );
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const businessId = await this.internalBusiness.getId();
    return this.formsService.remove(businessId, id);
  }

  @Post(':id/duplicate')
  async duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DuplicateFormDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.formsService.duplicate(businessId, id, dto);
  }

  @Post(':id/publish')
  async publish(@Param('id', ParseUUIDPipe) id: string) {
    const businessId = await this.internalBusiness.getId();
    return this.formsService.publish(businessId, id);
  }

  @Post(':id/move-to-draft')
  async moveToDraft(@Param('id', ParseUUIDPipe) id: string) {
    const businessId = await this.internalBusiness.getId();
    return this.formsService.moveToDraft(businessId, id);
  }

  @Post(':id/archive')
  async archive(@Param('id', ParseUUIDPipe) id: string) {
    const businessId = await this.internalBusiness.getId();
    return this.formsService.archive(businessId, id);
  }
}
