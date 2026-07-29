import {
  computePaidMinutes,
  formatPaidHoursDisplay,
} from '../utils/paid-hours.util';
import { formatStaffName } from '../utils/staff-name.util';
import {
  formatDayDisplay,
  formatDayKey,
  formatTimeDisplay,
} from '../utils/time-display.util';
import { TimeCardWithUser } from '../repositories/time-card.repository';
import {
  TimeCardDetailDto,
  TimeCardListItemDto,
} from '../dto/time-card-response.dto';

export function toTimeCardListItem(
  card: TimeCardWithUser,
  timezone: string,
): TimeCardListItemDto {
  return {
    id: card.id,
    day: formatDayKey(card.clockInTime, timezone),
    dayDisplay: formatDayDisplay(card.clockInTime, timezone),
    staff: {
      id: card.userId,
      name: formatStaffName(card.user),
    },
    clockInTime: formatTimeDisplay(card.clockInTime, timezone),
    clockOutTime: card.clockOutTime
      ? formatTimeDisplay(card.clockOutTime, timezone)
      : null,
    paidMinutes: card.paidMinutes,
    paidHoursDisplay: formatPaidHoursDisplay(card.paidMinutes),
    notes: card.notes,
  };
}

export function toTimeCardDetail(
  card: TimeCardWithUser,
  timezone: string,
): TimeCardDetailDto {
  const list = toTimeCardListItem(card, timezone);
  return {
    ...list,
    clockInTimeIso: card.clockInTime.toISOString(),
    clockOutTimeIso: card.clockOutTime?.toISOString() ?? null,
  };
}

export { computePaidMinutes, formatPaidHoursDisplay };
