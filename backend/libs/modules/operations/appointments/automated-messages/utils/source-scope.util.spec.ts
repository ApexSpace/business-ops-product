import {
  AppointmentAutomatedMessageOffsetUnit,
  AppointmentAutomatedMessageSourceScope,
  AppointmentAutomatedMessageTriggerKind,
  AppointmentSource,
} from '@prisma/client';
import {
  matchingBeforeStartMessages,
  matchingImmediateNotificationKeys,
} from './message-resolver.util';
import { offsetToHours, sourceMatchesScope } from './source-scope.util';

describe('sourceMatchesScope', () => {
  it('matches ALL for any source', () => {
    expect(
      sourceMatchesScope(
        AppointmentSource.INTERNAL,
        AppointmentAutomatedMessageSourceScope.ALL,
      ),
    ).toBe(true);
    expect(
      sourceMatchesScope(
        AppointmentSource.PUBLIC_LINK,
        AppointmentAutomatedMessageSourceScope.ALL,
      ),
    ).toBe(true);
  });

  it('matches ONLINE sources only', () => {
    expect(
      sourceMatchesScope(
        AppointmentSource.BOOKING_WIDGET,
        AppointmentAutomatedMessageSourceScope.ONLINE,
      ),
    ).toBe(true);
    expect(
      sourceMatchesScope(
        AppointmentSource.INTERNAL,
        AppointmentAutomatedMessageSourceScope.ONLINE,
      ),
    ).toBe(false);
  });

  it('matches STAFF for INTERNAL only', () => {
    expect(
      sourceMatchesScope(
        AppointmentSource.INTERNAL,
        AppointmentAutomatedMessageSourceScope.STAFF,
      ),
    ).toBe(true);
    expect(
      sourceMatchesScope(
        AppointmentSource.EXPRESS,
        AppointmentAutomatedMessageSourceScope.STAFF,
      ),
    ).toBe(false);
  });
});

describe('matchingImmediateNotificationKeys', () => {
  it('returns keys for matching enabled immediate messages', () => {
    const keys = matchingImmediateNotificationKeys(
      [
        {
          kind: AppointmentAutomatedMessageTriggerKind.IMMEDIATE,
          messages: [
            {
              enabled: true,
              sourceScope: AppointmentAutomatedMessageSourceScope.ONLINE,
              notificationKey: 'appointment.confirmation',
            },
            {
              enabled: true,
              sourceScope: AppointmentAutomatedMessageSourceScope.STAFF,
              notificationKey: 'appointment.confirmation',
            },
          ],
        },
      ],
      AppointmentSource.PUBLIC_LINK,
    );
    expect(keys).toEqual(['appointment.confirmation']);
  });

  it('ignores staff-only messages for online bookings', () => {
    const keys = matchingImmediateNotificationKeys(
      [
        {
          kind: AppointmentAutomatedMessageTriggerKind.IMMEDIATE,
          messages: [
            {
              enabled: true,
              sourceScope: AppointmentAutomatedMessageSourceScope.STAFF,
              notificationKey: 'appointment.confirmation',
            },
          ],
        },
      ],
      AppointmentSource.PUBLIC_LINK,
    );
    expect(keys).toEqual([]);
  });
});

describe('matchingBeforeStartMessages', () => {
  it('skips disabled messages and returns enabled BEFORE_START rows', () => {
    const rows = matchingBeforeStartMessages(
      [
        {
          id: 't-2d',
          kind: AppointmentAutomatedMessageTriggerKind.BEFORE_START,
          offsetValue: 2,
          offsetUnit: AppointmentAutomatedMessageOffsetUnit.DAYS,
          messages: [
            {
              id: 'm1',
              enabled: true,
              sourceScope: AppointmentAutomatedMessageSourceScope.ALL,
              notificationKey: 'appointment.reminder',
            },
          ],
        },
        {
          id: 't-3h',
          kind: AppointmentAutomatedMessageTriggerKind.BEFORE_START,
          offsetValue: 3,
          offsetUnit: AppointmentAutomatedMessageOffsetUnit.HOURS,
          messages: [
            {
              id: 'm2',
              enabled: false,
              sourceScope: AppointmentAutomatedMessageSourceScope.ALL,
              notificationKey: 'appointment.reminder',
            },
          ],
        },
      ],
      AppointmentSource.INTERNAL,
    );

    expect(rows).toEqual([
      {
        triggerId: 't-2d',
        offsetValue: 2,
        offsetUnit: AppointmentAutomatedMessageOffsetUnit.DAYS,
        notificationKeys: ['appointment.reminder'],
      },
    ]);
  });

  it('returns distinct trigger rows with matching keys', () => {
    const rows = matchingBeforeStartMessages(
      [
        {
          id: 't-2d',
          kind: AppointmentAutomatedMessageTriggerKind.BEFORE_START,
          offsetValue: 2,
          offsetUnit: AppointmentAutomatedMessageOffsetUnit.DAYS,
          messages: [
            {
              id: 'm1',
              enabled: true,
              sourceScope: AppointmentAutomatedMessageSourceScope.ALL,
              notificationKey: 'appointment.reminder',
            },
          ],
        },
        {
          id: 't-3h',
          kind: AppointmentAutomatedMessageTriggerKind.BEFORE_START,
          offsetValue: 3,
          offsetUnit: AppointmentAutomatedMessageOffsetUnit.HOURS,
          messages: [
            {
              id: 'm2',
              enabled: true,
              sourceScope: AppointmentAutomatedMessageSourceScope.ALL,
              notificationKey: 'appointment.reminder',
            },
          ],
        },
      ],
      AppointmentSource.INTERNAL,
    );

    expect(rows).toEqual([
      {
        triggerId: 't-2d',
        offsetValue: 2,
        offsetUnit: AppointmentAutomatedMessageOffsetUnit.DAYS,
        notificationKeys: ['appointment.reminder'],
      },
      {
        triggerId: 't-3h',
        offsetValue: 3,
        offsetUnit: AppointmentAutomatedMessageOffsetUnit.HOURS,
        notificationKeys: ['appointment.reminder'],
      },
    ]);
  });
});

describe('offsetToHours', () => {
  it('converts days and hours', () => {
    expect(offsetToHours(2, AppointmentAutomatedMessageOffsetUnit.DAYS)).toBe(
      48,
    );
    expect(offsetToHours(3, AppointmentAutomatedMessageOffsetUnit.HOURS)).toBe(
      3,
    );
  });
});
