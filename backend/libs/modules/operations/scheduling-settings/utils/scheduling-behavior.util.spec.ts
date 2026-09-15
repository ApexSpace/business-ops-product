import {
  applyProcessingFeatureFlag,
  assertValidRebookingJumpWeeks,
  parseRebookingJumpWeeks,
  resolveEffectiveBuffers,
} from './scheduling-behavior.util';

describe('scheduling-behavior.util', () => {
  describe('parseRebookingJumpWeeks', () => {
    it('returns default when input is invalid', () => {
      expect(parseRebookingJumpWeeks(null)).toEqual([2, 3, 4, 5, 6, 7]);
    });

    it('deduplicates, sorts, and caps at 8 items', () => {
      expect(parseRebookingJumpWeeks([5, 2, 5, 9, 1, 3, 4, 6, 7, 8])).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8,
      ]);
    });
  });

  describe('assertValidRebookingJumpWeeks', () => {
    it('throws for empty or out-of-range values', () => {
      expect(() => assertValidRebookingJumpWeeks([])).toThrow();
      expect(() => assertValidRebookingJumpWeeks([0])).toThrow();
      expect(() => assertValidRebookingJumpWeeks([13])).toThrow();
    });
  });

  describe('resolveEffectiveBuffers', () => {
    it('returns zero when buffer time is disabled', () => {
      expect(
        resolveEffectiveBuffers({
          bufferTimeEnabled: false,
          timing: {
            hasBufferTime: true,
            bufferBeforeMinutes: 10,
            bufferAfterMinutes: 5,
          },
          businessFallback: { bufferBeforeMinutes: 15, bufferAfterMinutes: 15 },
        }),
      ).toEqual({ bufferBeforeMinutes: 0, bufferAfterMinutes: 0 });
    });

    it('uses service timing when present', () => {
      expect(
        resolveEffectiveBuffers({
          bufferTimeEnabled: true,
          timing: {
            hasBufferTime: true,
            bufferBeforeMinutes: 10,
            bufferAfterMinutes: 5,
          },
          businessFallback: { bufferBeforeMinutes: 15, bufferAfterMinutes: 15 },
        }),
      ).toEqual({ bufferBeforeMinutes: 10, bufferAfterMinutes: 5 });
    });

    it('falls back to business defaults when service has no buffer', () => {
      expect(
        resolveEffectiveBuffers({
          bufferTimeEnabled: true,
          timing: {
            hasBufferTime: false,
            bufferBeforeMinutes: 0,
            bufferAfterMinutes: 0,
          },
          businessFallback: { bufferBeforeMinutes: 15, bufferAfterMinutes: 20 },
        }),
      ).toEqual({ bufferBeforeMinutes: 15, bufferAfterMinutes: 20 });
    });
  });

  describe('applyProcessingFeatureFlag', () => {
    it('zeroes processing when disabled', () => {
      expect(
        applyProcessingFeatureFlag(
          {
            hasProcessingTime: true,
            processingDurationMinutes: 30,
            finishDurationMinutes: 15,
          },
          false,
        ),
      ).toEqual({
        hasProcessingTime: false,
        processingDurationMinutes: 0,
        finishDurationMinutes: 0,
      });
    });
  });
});
