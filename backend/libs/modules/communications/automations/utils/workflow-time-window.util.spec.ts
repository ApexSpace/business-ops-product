import { msUntilAllowedTimeWindow } from './workflow-time-window.util';
import { DEFAULT_WORKFLOW_SETTINGS } from '../types/workflow.types';

describe('workflow-time-window.util', () => {
  it('returns 0 when time window is disabled', () => {
    expect(msUntilAllowedTimeWindow(DEFAULT_WORKFLOW_SETTINGS)).toBe(0);
  });

  it('returns positive delay when outside the configured window', () => {
    const settings = {
      ...DEFAULT_WORKFLOW_SETTINGS,
      timeWindowEnabled: true,
      timeWindow: { start: '09:00', end: '10:00' },
      timezone: 'UTC',
    };

    const noon = new Date('2026-06-18T12:00:00.000Z');
    expect(msUntilAllowedTimeWindow(settings, noon)).toBeGreaterThan(0);
  });
});
