import { api } from "@/lib/api/client";

export interface WaitingRoomSettings {
  waitingStatusEnabled: boolean;
}

export type UpdateWaitingRoomSettingsBody = Partial<WaitingRoomSettings>;

export function getWaitingRoomSettings() {
  return api.get<WaitingRoomSettings>("waiting-room-settings");
}

export function updateWaitingRoomSettings(body: UpdateWaitingRoomSettingsBody) {
  return api.patch<WaitingRoomSettings>("waiting-room-settings", body);
}
