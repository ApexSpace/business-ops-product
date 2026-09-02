import { randomUUID } from 'crypto';
import { AppointmentSource } from '@prisma/client';
import { isOnlineBookingSource } from '../cancel-reschedule-settings/utils/cancel-reschedule-behavior.util';

export function generateClientManageToken(): string {
  return randomUUID();
}

export function buildAppointmentManageUrl(
  frontendUrl: string,
  token: string,
): string {
  const base = frontendUrl.replace(/\/$/, '');
  return `${base}/manage/${token}`;
}

export function buildAppointmentManageFields(options: {
  source: AppointmentSource;
  isTimeBlock?: boolean;
  existingToken?: string | null;
}): { clientManageToken?: string; bookedAt?: Date } {
  const fields: { clientManageToken?: string; bookedAt?: Date } = {};
  if (!options.isTimeBlock && !options.existingToken) {
    fields.clientManageToken = generateClientManageToken();
  }
  if (isOnlineBookingSource(options.source)) {
    fields.bookedAt = new Date();
  }
  return fields;
}