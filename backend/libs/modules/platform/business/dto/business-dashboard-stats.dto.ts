import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class WorkItemStatsDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  scheduled!: number;

  @ApiProperty()
  completed!: number;

  @ApiProperty()
  pending!: number;
}

class LeadStatsDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  active!: number;

  @ApiProperty()
  won!: number;

  @ApiProperty()
  lost!: number;

  @ApiProperty()
  archived!: number;
}

class AppointmentStatsDto {
  @ApiProperty()
  today!: number;

  @ApiProperty()
  upcoming!: number;

  @ApiProperty()
  cancelledOrNoShow!: number;
}

class RevenueDayStatsDto {
  @ApiProperty({ example: '1250.00' })
  amount!: string;

  @ApiProperty()
  paymentCount!: number;
}

class DashboardAttentionStatsDto {
  @ApiProperty()
  overdueInvoices!: number;

  @ApiProperty({ example: '450.00' })
  overdueInvoiceBalance!: string;

  @ApiProperty()
  lowStockProducts!: number;

  @ApiProperty()
  unreadConversations!: number;
}

export class BusinessDashboardStatsDto {
  @ApiProperty()
  contacts!: number;

  @ApiProperty({ type: LeadStatsDto })
  leads!: LeadStatsDto;

  @ApiProperty()
  pipelines!: number;

  @ApiProperty()
  appointments!: number;

  @ApiProperty({ type: AppointmentStatsDto })
  appointmentStats!: AppointmentStatsDto;

  @ApiProperty()
  conversations!: number;

  @ApiProperty()
  members!: number;

  @ApiProperty({ type: WorkItemStatsDto })
  workItems!: WorkItemStatsDto;

  @ApiProperty({ type: RevenueDayStatsDto })
  revenueToday!: RevenueDayStatsDto;

  @ApiPropertyOptional({ type: RevenueDayStatsDto })
  revenueYesterday?: RevenueDayStatsDto;

  @ApiProperty({ type: DashboardAttentionStatsDto })
  attention!: DashboardAttentionStatsDto;
}
