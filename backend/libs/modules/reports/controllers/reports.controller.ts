import {

  Body,

  Controller,

  Get,

  Param,

  Post,

  StreamableFile,

  UseGuards,

} from '@nestjs/common';

import {

  ApiBearerAuth,

  ApiOkResponse,

  ApiProduces,

  ApiTags,

} from '@nestjs/swagger';

import { BusinessMemberRole } from '@prisma/client';

import { CurrentUser } from '@app/common/decorators/current-user.decorator';

import type { RequestUser } from '@app/common/decorators/current-user.decorator';

import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';

import { RequireModule } from '@app/common/decorators/require-module.decorator';

import { SkipEnvelope } from '@app/common/decorators/skip-envelope.decorator';

import { StaffPermission } from '@app/common/decorators/staff-permission.decorator';

import { BusinessCapabilityGuard } from '@app/common/guards/business-capability.guard';

import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';

import { ExportReportDto, GenerateReportDto } from '../dto/report.dto';

import { ReportExportService } from '../services/report-export.service';

import { ReportQueryService } from '../services/report-query.service';



@ApiTags('reports')

@ApiBearerAuth()

@Controller('reports')

@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)

@RequireModule('reports')

@StaffPermission('reports.access')

export class ReportsController {

  constructor(

    private readonly reportQuery: ReportQueryService,

    private readonly reportExport: ReportExportService,

  ) {}



  @Get()

  @BusinessRoles(

    BusinessMemberRole.OWNER,

    BusinessMemberRole.ADMIN,

    BusinessMemberRole.MEMBER,

  )

  @ApiOkResponse({ description: 'Capability-filtered report catalog' })

  listCatalog(@CurrentUser() user: RequestUser) {

    return this.reportQuery.listCatalog(user.businessId!);

  }



  @Post(':key/generate')

  @BusinessRoles(

    BusinessMemberRole.OWNER,

    BusinessMemberRole.ADMIN,

    BusinessMemberRole.MEMBER,

  )

  generate(

    @CurrentUser() user: RequestUser,

    @Param('key') key: string,

    @Body() dto: GenerateReportDto,

  ) {

    return this.reportQuery.generate(

      user.businessId!,

      key,

      dto.filters ?? {},

    );

  }



  @Post(':key/export')

  @SkipEnvelope()

  @BusinessRoles(

    BusinessMemberRole.OWNER,

    BusinessMemberRole.ADMIN,

    BusinessMemberRole.MEMBER,

  )

  @ApiProduces(

    'application/pdf',

    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

  )

  @ApiOkResponse({ description: 'Report file download (PDF or Excel)' })

  async export(

    @CurrentUser() user: RequestUser,

    @Param('key') key: string,

    @Body() dto: ExportReportDto,

  ): Promise<StreamableFile> {

    const file = await this.reportExport.renderExport({

      businessId: user.businessId!,

      reportKey: key,

      format: dto.format,

      filters: dto.filters ?? {},

    });



    const safeName = file.fileName.replace(/["\\\r\n]/g, '_');

    return new StreamableFile(file.buffer, {

      type: file.mimeType,

      disposition: `attachment; filename="${safeName}"`,

    });

  }

}

