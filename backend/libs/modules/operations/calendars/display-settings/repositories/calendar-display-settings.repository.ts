import { Injectable } from '@nestjs/common';
import {
  BusinessCalendarDisplaySettings,
  CalendarZoomLevel,
  DayOfWeek,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import {
  DEFAULT_VISIBLE_END,
  DEFAULT_VISIBLE_START,
} from '../utils/calendar-display-settings.util';

@Injectable()
export class CalendarDisplaySettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByBusinessId(
    businessId: string,
  ): Promise<BusinessCalendarDisplaySettings | null> {
    return this.prisma.businessCalendarDisplaySettings.findUnique({
      where: { businessId },
    });
  }

  ensureSettings(
    businessId: string,
  ): Promise<BusinessCalendarDisplaySettings> {
    return this.prisma.businessCalendarDisplaySettings.upsert({
      where: { businessId },
      create: {
        businessId,
        visibleStartTime: DEFAULT_VISIBLE_START,
        visibleEndTime: DEFAULT_VISIBLE_END,
        weekStartsOn: DayOfWeek.SUNDAY,
        zoomLevel: CalendarZoomLevel.MEDIUM,
        showNormalCancellation: true,
        showLateCancellation: true,
        showNoShow: true,
        highContrastEnabled: false,
        showBufferOnCalendar: false,
      },
      update: {},
    });
  }

  upsert(
    businessId: string,
    data: Prisma.BusinessCalendarDisplaySettingsUpdateInput,
  ): Promise<BusinessCalendarDisplaySettings> {
    return this.prisma.businessCalendarDisplaySettings.update({
      where: { businessId },
      data,
    });
  }
}
