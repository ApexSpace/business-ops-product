import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@app/common/decorators/public.decorator';
import { InitiatePackageCheckoutDto } from '../dto/package.dto';
import { PackageOnlineCheckoutService } from '../services/package-online-checkout.service';

@ApiTags('public-packages')
@Controller('public/packages')
@Public()
export class PackagesPublicController {
  constructor(
    private readonly onlineCheckoutService: PackageOnlineCheckoutService,
  ) {}

  @Get(':slug')
  getCatalog(@Param('slug') slug: string) {
    return this.onlineCheckoutService.getPublicCatalog(slug);
  }

  @Get(':slug/:templateId')
  getPackage(
    @Param('slug') slug: string,
    @Param('templateId', ParseUUIDPipe) templateId: string,
  ) {
    return this.onlineCheckoutService.getPackageForCheckout(slug, templateId);
  }

  @Post(':slug/:templateId/checkout')
  initiateCheckout(
    @Param('slug') slug: string,
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Body() dto: InitiatePackageCheckoutDto,
  ) {
    return this.onlineCheckoutService.initiateCheckout(slug, templateId, dto);
  }
}
