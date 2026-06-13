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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { RequireCapability } from '@app/common/decorators/require-capability.decorator';
import { RequireModule } from '@app/common/decorators/require-module.decorator';
import { BusinessCapabilityGuard } from '@app/common/guards/business-capability.guard';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import {
  CreateWhatsAppTemplateDto,
  CreateWhatsAppTemplateWithHeaderDto,
  ListWhatsAppTemplatesQueryDto,
  UpdateWhatsAppTemplateDto,
} from '../dto/whatsapp-template.dto';
import { WhatsAppTemplateService } from '../services/whatsapp-template.service';

@ApiTags('integrations')
@ApiBearerAuth()
@Controller('integrations/business/whatsapp/templates')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('conversations')
export class WhatsAppTemplatesController {
  constructor(private readonly templateService: WhatsAppTemplateService) {}

  @Get('options')
  @RequireCapability('conversations.whatsapp_templates_view')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  getOptions() {
    return this.templateService.getOptions();
  }

  @Get('approved')
  @RequireCapability('conversations.whatsapp_templates_view')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  listApproved(@CurrentUser() user: RequestUser) {
    return this.templateService.listApproved(user.businessId!);
  }

  @Post('sync')
  @RequireCapability('conversations.whatsapp_templates_manage')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  syncAll(@CurrentUser() user: RequestUser) {
    return this.templateService.syncAll(user.businessId!);
  }

  @Post('with-header-sample')
  @RequireCapability('conversations.whatsapp_templates_manage')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        name: { type: 'string' },
        language: { type: 'string' },
        category: { type: 'string' },
        headerFormat: { type: 'string', enum: ['IMAGE', 'VIDEO', 'DOCUMENT'] },
        components: { type: 'string', description: 'JSON array of components' },
        parameterFormat: { type: 'string' },
      },
      required: ['file', 'name', 'language', 'category', 'headerFormat', 'components'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 16 * 1024 * 1024 },
    }),
  )
  async createWithHeaderSample(
    @CurrentUser() user: RequestUser,
    @UploadedFile()
    file:
      | {
          buffer: Buffer;
          mimetype: string;
          originalname: string;
        }
      | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const dto = await parseCreateWithHeaderDto(body);
    return this.templateService.createWithHeaderSample(
      user.businessId!,
      dto,
      file,
      user,
    );
  }

  @Get()
  @RequireCapability('conversations.whatsapp_templates_view')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  list(
    @CurrentUser() user: RequestUser,
    @Query() query: ListWhatsAppTemplatesQueryDto,
  ) {
    return this.templateService.list(user.businessId!, query);
  }

  @Post()
  @RequireCapability('conversations.whatsapp_templates_manage')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateWhatsAppTemplateDto,
  ) {
    return this.templateService.create(user.businessId!, dto, user);
  }

  @Get(':id')
  @RequireCapability('conversations.whatsapp_templates_view')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  getById(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.templateService.getById(user.businessId!, id);
  }

  @Patch(':id')
  @RequireCapability('conversations.whatsapp_templates_manage')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWhatsAppTemplateDto,
  ) {
    return this.templateService.update(user.businessId!, id, dto);
  }

  @Post(':id/sync')
  @RequireCapability('conversations.whatsapp_templates_manage')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  syncOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.templateService.syncOne(user.businessId!, id);
  }

  @Delete(':id')
  @RequireCapability('conversations.whatsapp_templates_manage')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  async delete(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.templateService.delete(user.businessId!, id);
    return { success: true };
  }
}

async function parseCreateWithHeaderDto(
  body: Record<string, unknown>,
): Promise<CreateWhatsAppTemplateWithHeaderDto> {
  const components = parseJsonField(body.components);
  const dto = plainToInstance(CreateWhatsAppTemplateWithHeaderDto, {
    ...body,
    components,
  });
  await validateOrReject(dto);
  return dto;
}

function parseJsonField(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}
