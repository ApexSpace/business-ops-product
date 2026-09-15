import { CalendarZoomLevel, DayOfWeek } from '@prisma/client';
import { HttpStatus } from '@nestjs/common';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$|^24:00$/;

export const DEFAULT_VISIBLE_START = '00:00';
export const DEFAULT_VISIBLE_END = '24:00';

export const SLOT_HEIGHT_BY_ZOOM: Record<CalendarZoomLevel, number> = {
  [CalendarZoomLevel.SMALL]: 20,
  [CalendarZoomLevel.MEDIUM]: 30,
  [CalendarZoomLevel.LARGE]: 40,
};

export function parseTimeToMinutes(value: string): number {
  const trimmed = value.trim();
  if (trimmed === '24:00') {
    return 24 * 60;
  }
  const match = /^(\d{2}):(\d{2})$/.exec(trimmed);
  if (!match) {
    throw new AppException(
      ErrorCode.VALIDATION_ERROR,
      'Invalid time format',
      HttpStatus.BAD_REQUEST,
    );
  }
  const hours = parseInt(match[1]!, 10);
  const minutes = parseInt(match[2]!, 10);
  return hours * 60 + minutes;
}

export function assertValidVisibleHours(
  visibleStartTime: string,
  visibleEndTime: string,
): void {
  if (!TIME_PATTERN.test(visibleStartTime.trim())) {
    throw new AppException(
      ErrorCode.VALIDATION_ERROR,
      'visibleStartTime must be HH:mm on 15-minute increments',
      HttpStatus.BAD_REQUEST,
    );
  }
  if (!TIME_PATTERN.test(visibleEndTime.trim())) {
    throw new AppException(
      ErrorCode.VALIDATION_ERROR,
      'visibleEndTime must be HH:mm or 24:00 on 15-minute increments',
      HttpStatus.BAD_REQUEST,
    );
  }

  const startMinutes = parseTimeToMinutes(visibleStartTime);
  const endMinutes = parseTimeToMinutes(visibleEndTime);

  if (startMinutes % 15 !== 0 || (endMinutes !== 24 * 60 && endMinutes % 15 !== 0)) {
    throw new AppException(
      ErrorCode.VALIDATION_ERROR,
      'Times must align to 15-minute increments',
      HttpStatus.BAD_REQUEST,
    );
  }

  if (endMinutes <= startMinutes) {
    throw new AppException(
      ErrorCode.VALIDATION_ERROR,
      'visibleEndTime must be after visibleStartTime',
      HttpStatus.BAD_REQUEST,
    );
  }

  if (endMinutes - startMinutes < 60) {
    throw new AppException(
      ErrorCode.VALIDATION_ERROR,
      'Visible hours window must be at least 1 hour',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export function assertValidWeekStartsOn(weekStartsOn: DayOfWeek): void {
  if (weekStartsOn !== DayOfWeek.SUNDAY && weekStartsOn !== DayOfWeek.MONDAY) {
    throw new AppException(
      ErrorCode.VALIDATION_ERROR,
      'weekStartsOn must be SUNDAY or MONDAY',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export function slotHeightForZoom(zoomLevel: CalendarZoomLevel): number {
  return SLOT_HEIGHT_BY_ZOOM[zoomLevel] ?? SLOT_HEIGHT_BY_ZOOM.MEDIUM;
}
