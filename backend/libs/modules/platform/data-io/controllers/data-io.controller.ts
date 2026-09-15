import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProduces, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole, DataImportEntityType } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { SkipEnvelope } from '@app/common/decorators/skip-envelope.decorator';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import {
  AttachDataImportFileDto,
  ConfigureDataImportDto,
  CreateDataImportDto,
  DataExportQueryDto,
  ListDataImportsQueryDto,
} from '../dto/data-import.dto';
import { DataImportService } from '../services/data-import.service';
import { DataExportService } from '../services/data-export.service';

function csvDownload(csv: string, filename: string): StreamableFile {
  const safeName = filename.replace(/["\\\r\n]/g, '_');
  return new StreamableFile(Buffer.from(csv, 'utf8'), {
    type: 'text/csv; charset=utf-8',
    disposition: `attachment; filename="${safeName}"`,
  });
}

@ApiTags('data-io')
@ApiBearerAuth()
@Controller()
@UseGuards(BusinessRolesGuard)
export class DataIoController {
  constructor(
    private readonly dataImportService: DataImportService,
    private readonly dataExportService: DataExportService,
  ) {}

  @Get('data-io/entities')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  listEntities() {
    return this.dataImportService.listEntities();
  }

  @Get('data-imports/template')
  @SkipEnvelope()
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  @ApiProduces('text/csv')
  template(
    @Query('entityType') entityType: DataImportEntityType,
  ): StreamableFile {
    const csv = this.dataImportService.getTemplate(entityType);
    return csvDownload(csv, `${entityType.toLowerCase()}-import-template.csv`);
  }

  @Post('data-imports')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateDataImportDto) {
    return this.dataImportService.createDraft(user.businessId!, dto, user);
  }

  @Get('data-imports')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  list(
    @CurrentUser() user: RequestUser,
    @Query() query: ListDataImportsQueryDto,
  ) {
    return this.dataImportService.list(user.businessId!, query);
  }

  @Get('data-imports/:id')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  get(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.dataImportService.get(user.businessId!, id);
  }

  @Post('data-imports/:id/attach-file')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  attachFile(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AttachDataImportFileDto,
  ) {
    return this.dataImportService.attachFile(user.businessId!, id, dto);
  }

  @Post('data-imports/:id/configure')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  configure(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfigureDataImportDto,
  ) {
    return this.dataImportService.configure(user.businessId!, id, dto);
  }

  @Post('data-imports/:id/start')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  start(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.dataImportService.start(user.businessId!, id, user);
  }

  @Get('data-exports')
  @SkipEnvelope()
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  @ApiProduces('text/csv')
  async export(
    @CurrentUser() user: RequestUser,
    @Query() query: DataExportQueryDto,
  ): Promise<StreamableFile> {
    const result = await this.dataExportService.exportCsv(
      user.businessId!,
      query.entityType,
      { search: query.search },
    );
    return csvDownload(result.csv, result.filename);
  }
}
