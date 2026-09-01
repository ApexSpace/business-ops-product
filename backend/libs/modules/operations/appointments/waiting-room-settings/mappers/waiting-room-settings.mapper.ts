import type { BusinessWaitingRoomSettings } from '@prisma/client';
import { WaitingRoomSettingsResponseDto } from '../dto/waiting-room-settings.dto';

export function toWaitingRoomSettingsResponse(
  settings: BusinessWaitingRoomSettings,
): WaitingRoomSettingsResponseDto {
  return {
    waitingStatusEnabled: settings.waitingStatusEnabled,
  };
}
