import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HttpStatus } from '@nestjs/common';
import { Public } from '@app/common/decorators/public.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { ValidateOfferCodeDto } from '../dto/offer.dto';
import { toOfferResponse } from '../mappers/offer.mapper';
import { OfferEvaluationService } from '../services/offer-evaluation.service';
import { OfferRepository } from '../repositories/offer.repository';

@ApiTags('offers-public')
@Controller('public/offers')
export class OffersPublicController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly evaluationService: OfferEvaluationService,
    private readonly offerRepository: OfferRepository,
  ) {}

  @Get(':slug/has-offer-codes')
  @Public()
  async hasOfferCodes(@Param('slug') slug: string) {
    const business = await this.resolveBusinessByBookingSlug(slug);
    const hasCodes = await this.offerRepository.hasOfferCodeOffers(business.id);
    return { hasOfferCodes: hasCodes };
  }

  @Post(':slug/validate-code')
  @Public()
  async validateCode(
    @Param('slug') slug: string,
    @Body() dto: ValidateOfferCodeDto,
  ) {
    const business = await this.resolveBusinessByBookingSlug(slug);
    const offer = await this.evaluationService.validateOfferCode(
      business.id,
      dto.code,
    );
    if (!offer) {
      throw new AppException(
        ErrorCode.OFFER_CODE_NOT_FOUND,
        'Offer code not found or not valid.',
        HttpStatus.NOT_FOUND,
      );
    }
    return toOfferResponse(offer);
  }

  private async resolveBusinessByBookingSlug(slug: string) {
    const settings = await this.prisma.businessOnlineBookingSettings.findFirst({
      where: {
        publicSlug: slug,
        onlineBookingEnabled: true,
      },
      select: {
        businessId: true,
        business: { select: { id: true, name: true } },
      },
    });
    if (!settings) {
      throw new AppException(
        ErrorCode.PUBLIC_BOOKING_DISABLED,
        'Booking not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return settings.business;
  }
}
