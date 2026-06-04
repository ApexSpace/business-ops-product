import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { BusinessMemberRole } from '@prisma/client';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { FilesService } from '../../application/files.service';
import { CreateUploadIntentDto } from '../dto/create-upload-intent.dto';

@ApiTags('files')
@ApiBearerAuth()
@Controller('files')
@UseGuards(BusinessRolesGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload-intent')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  createUploadIntent(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateUploadIntentDto,
  ) {
    return this.filesService.createUploadIntent(
      user.businessId!,
      user.id,
      dto,
    );
  }

  @Post(':id/confirm')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  confirmUpload(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.filesService.confirmUpload(user.businessId!, user.id, id);
  }

  @Get(':id/download-url')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  downloadUrl(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.filesService.getDownloadUrl(user.businessId!, user.id, id);
  }
}
