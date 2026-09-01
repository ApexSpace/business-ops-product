import type { BusinessCalendarDisplaySettings } from '@prisma/client';
import { CalendarDisplaySettingsResponseDto } from '../dto/calendar-display-settings.dto';

export function toCalendarDisplaySettingsResponse(
  settings: BusinessCalendarDisplaySettings,
): CalendarDisplaySettingsResponseDto {
  return {
    id: settings.id,
    businessId: settings.businessId,
    visibleStartTime: settings.visibleStartTime,
    visibleEndTime: settings.visibleEndTime,
    weekStartsOn: settings.weekStartsOn,
    zoomLevel: settings.zoomLevel,
    showNormalCancellation: settings.showNormalCancellation,
    showLateCancellation: settings.showLateCancellation,
    showNoShow: settings.showNoShow,
    highContrastEnabled: settings.highContrastEnabled,
    showBufferOnCalendar: settings.showBufferOnCalendar,
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt,
  };
}
