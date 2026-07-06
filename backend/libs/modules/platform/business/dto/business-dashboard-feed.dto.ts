import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AppointmentSource,
  AppointmentStatus,
  ConversationChannel,
  TaskPriority,
} from '@prisma/client';
import { BusinessDashboardStatsDto } from './business-dashboard-stats.dto';

class DashboardFeedContactDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  firstName?: string | null;

  @ApiPropertyOptional()
  lastName?: string | null;

  @ApiPropertyOptional()
  displayName?: string | null;
}

class DashboardFeedStaffDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  firstName?: string | null;

  @ApiPropertyOptional()
  lastName?: string | null;

  @ApiPropertyOptional()
  displayName?: string | null;
}

export class DashboardFeedAppointmentDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  startAt!: string;

  @ApiProperty()
  endAt!: string;

  @ApiProperty({ enum: AppointmentStatus })
  status!: AppointmentStatus;

  @ApiProperty({ enum: AppointmentSource })
  source!: AppointmentSource;

  @ApiProperty({ type: DashboardFeedContactDto })
  contact!: DashboardFeedContactDto;

  @ApiPropertyOptional()
  serviceName?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiPropertyOptional({ type: DashboardFeedStaffDto })
  assignedTo?: DashboardFeedStaffDto | null;
}

export class DashboardAttentionItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  href!: string;
}

export class DashboardRecentConversationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ConversationChannel })
  channel!: ConversationChannel;

  @ApiPropertyOptional()
  preview?: string | null;

  @ApiProperty()
  lastMessageAt!: string;

  @ApiProperty()
  unreadCount!: number;

  @ApiProperty()
  href!: string;

  @ApiPropertyOptional({ type: DashboardFeedContactDto })
  contact?: DashboardFeedContactDto | null;
}

export class DashboardTaskItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  dueAt!: string;

  @ApiPropertyOptional({ enum: TaskPriority })
  priority?: TaskPriority | null;

  @ApiPropertyOptional({ type: DashboardFeedStaffDto })
  assignedTo?: DashboardFeedStaffDto | null;
}

export class DashboardRevenueCategoryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ example: '1250.00' })
  amount!: string;

  @ApiProperty()
  sharePercent!: number;
}

export class DashboardBookingSourceDto {
  @ApiProperty({ enum: AppointmentSource })
  source!: AppointmentSource;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  count!: number;

  @ApiProperty()
  deltaPercent!: number;
}

export class DashboardOverviewDto {
  @ApiProperty()
  waitingClientsToday!: number;
}

export class DashboardTrendMetricDto {
  @ApiProperty()
  value!: number;

  @ApiProperty()
  deltaPercent!: number;

  @ApiProperty({ type: [Number] })
  points!: number[];
}

export class BusinessDashboardFeedDto {
  @ApiProperty({ type: BusinessDashboardStatsDto })
  stats!: BusinessDashboardStatsDto;

  @ApiProperty({ type: DashboardOverviewDto })
  overview!: DashboardOverviewDto;

  @ApiProperty({ type: DashboardTrendMetricDto })
  todayAppointmentsMetric!: DashboardTrendMetricDto;

  @ApiProperty({ type: DashboardTrendMetricDto })
  newLeadsMetric!: DashboardTrendMetricDto;

  @ApiProperty({ type: [DashboardFeedAppointmentDto] })
  todayAppointments!: DashboardFeedAppointmentDto[];

  @ApiProperty({ type: [DashboardAttentionItemDto] })
  attentionItems!: DashboardAttentionItemDto[];

  @ApiProperty({ type: [DashboardFeedAppointmentDto] })
  appointmentsToConfirm!: DashboardFeedAppointmentDto[];

  @ApiProperty({ type: [DashboardRecentConversationDto] })
  recentConversations!: DashboardRecentConversationDto[];

  @ApiProperty({ type: [DashboardTaskItemDto] })
  followUpTasks!: DashboardTaskItemDto[];

  @ApiProperty({ type: [DashboardTaskItemDto] })
  staffAssignments!: DashboardTaskItemDto[];

  @ApiProperty({ type: [DashboardRevenueCategoryDto] })
  revenueByCategory!: DashboardRevenueCategoryDto[];

  @ApiProperty({ type: [DashboardBookingSourceDto] })
  bookingsBySource!: DashboardBookingSourceDto[];
}
