import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@app/common/decorators/public.decorator';
import { InvoicePaymentService } from '../services/invoice-payment.service';

@ApiTags('public-invoices')
@Controller('public/invoices')
export class PublicInvoicesController {
  constructor(private readonly invoicePaymentService: InvoicePaymentService) {}

  @Get(':token')
  @Public()
  getByToken(@Param('token') token: string) {
    return this.invoicePaymentService.getPublicByToken(token);
  }

  @Post(':token/checkout')
  @Public()
  startCheckout(@Param('token') token: string) {
    return this.invoicePaymentService.startPublicCheckout(token);
  }
}
