import { ApiProperty } from '@nestjs/swagger';

export class PaymentsOverviewMetricDto {
  @ApiProperty()
  count!: number;

  @ApiProperty({ description: 'Decimal amount as string' })
  amount!: string;
}

export class PaymentsOverviewInvoicesDto {
  @ApiProperty()
  draft!: PaymentsOverviewMetricDto;

  @ApiProperty()
  due!: PaymentsOverviewMetricDto;

  @ApiProperty()
  received!: PaymentsOverviewMetricDto;

  @ApiProperty()
  overdue!: PaymentsOverviewMetricDto;
}

export class PaymentsOverviewEstimatesDto {
  @ApiProperty()
  sent!: PaymentsOverviewMetricDto;

  @ApiProperty()
  approved!: PaymentsOverviewMetricDto;

  @ApiProperty()
  rejected!: PaymentsOverviewMetricDto;

  @ApiProperty()
  converted!: PaymentsOverviewMetricDto;
}

export class PaymentsOverviewDto {
  @ApiProperty()
  invoices!: PaymentsOverviewInvoicesDto;

  @ApiProperty()
  estimates!: PaymentsOverviewEstimatesDto;
}
