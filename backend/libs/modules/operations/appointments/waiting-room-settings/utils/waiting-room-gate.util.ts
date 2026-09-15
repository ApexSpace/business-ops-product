import { AppointmentStatus } from '@prisma/client';

export function canTransitionToWaiting(waitingStatusEnabled: boolean): boolean {
  return waitingStatusEnabled;
}

export function canNotifyWaitingClient(
  waitingStatusEnabled: boolean,
  currentStatus: AppointmentStatus,
): boolean {
  if (currentStatus === AppointmentStatus.WAITING) {
    return true;
  }
  return waitingStatusEnabled;
}
