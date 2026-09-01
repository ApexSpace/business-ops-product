import { AppointmentStatus } from '@prisma/client';
import {
  canNotifyWaitingClient,
  canTransitionToWaiting,
} from './waiting-room-gate.util';

describe('waiting-room-gate.util', () => {
  describe('canTransitionToWaiting', () => {
    it('allows transition when waiting status is enabled', () => {
      expect(canTransitionToWaiting(true)).toBe(true);
    });

    it('blocks transition when waiting status is disabled', () => {
      expect(canTransitionToWaiting(false)).toBe(false);
    });
  });

  describe('canNotifyWaitingClient', () => {
    it('allows notify for in-flight waiting appointments when disabled', () => {
      expect(
        canNotifyWaitingClient(false, AppointmentStatus.WAITING),
      ).toBe(true);
    });

    it('allows notify when waiting status is enabled', () => {
      expect(
        canNotifyWaitingClient(true, AppointmentStatus.CONFIRMED),
      ).toBe(true);
    });

    it('blocks notify for non-waiting appointments when disabled', () => {
      expect(
        canNotifyWaitingClient(false, AppointmentStatus.CONFIRMED),
      ).toBe(false);
    });
  });
});
