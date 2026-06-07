import { ApiProperty } from '@nestjs/swagger';

export class CreateInvoicePaymentLinkResponseDto {
  @ApiProperty()
  checkoutUrl!: string;

  @ApiProperty()
  sessionId!: string;

  @ApiProperty()
  publicUrl!: string;
}
