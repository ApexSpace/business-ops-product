import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import { ConfirmUploadDto } from '../dto/confirm-upload.dto';
import { CreateUploadDto } from '../dto/create-upload.dto';
import { FailUploadDto } from '../dto/fail-upload.dto';
import { StorageService } from '../services/storage.service';

@ApiTags('storage')
@ApiBearerAuth()
@Controller('storage')
@UseGuards(BusinessRolesGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('uploads')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  createUpload(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateUploadDto,
  ) {
    return this.storageService.createUpload(user.businessId!, dto, user);
  }

  @Post('uploads/:id/confirm')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  confirmUpload(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() _dto: ConfirmUploadDto,
  ) {
    return this.storageService.confirmUpload(user.businessId!, id, user);
  }

  @Post('uploads/:id/fail')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  failUpload(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: FailUploadDto,
  ) {
    return this.storageService.failUpload(
      user.businessId!,
      id,
      dto.reason,
      user,
    );
  }

  @Get('files/:id')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  getFile(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.storageService.getFile(user.businessId!, id);
  }

  @Get('files/:id/download-url')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  getDownloadUrl(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.storageService.getDownloadUrl(user.businessId!, id);
  }

  @Delete('files/:id')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  deleteFile(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.storageService.deleteFile(user.businessId!, id, user);
  }
}
