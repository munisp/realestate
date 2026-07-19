import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isHighPriorityAlert,
} from '../alertThrottling';

describe('Alert Throttling Service', () => {
  describe('isHighPriorityAlert', () => {
    it('should identify high priority alerts (>= 10% change)', () => {
      expect(isHighPriorityAlert(10)).toBe(true);
      expect(isHighPriorityAlert(15)).toBe(true);
      expect(isHighPriorityAlert(-12)).toBe(true);
    });

    it('should identify low priority alerts (< 10% change)', () => {
      expect(isHighPriorityAlert(5)).toBe(false);
      expect(isHighPriorityAlert(-8)).toBe(false);
      expect(isHighPriorityAlert(0)).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isHighPriorityAlert(9.9)).toBe(false);
      expect(isHighPriorityAlert(10.0)).toBe(true);
      expect(isHighPriorityAlert(-10.0)).toBe(true);
      expect(isHighPriorityAlert(-9.9)).toBe(false);
    });
  });

  describe('Throttling Configuration', () => {
    it('should have correct default thresholds', () => {
      // High priority threshold is 10%
      expect(isHighPriorityAlert(10)).toBe(true);
      expect(isHighPriorityAlert(9.99)).toBe(false);
    });

    it('should apply to both positive and negative changes', () => {
      // Both increases and decreases should be treated the same
      expect(isHighPriorityAlert(15)).toBe(isHighPriorityAlert(-15));
      expect(isHighPriorityAlert(5)).toBe(isHighPriorityAlert(-5));
    });
  });

  describe('Alert Priority Logic', () => {
    it('should correctly categorize various percentage changes', () => {
      const testCases = [
        { change: 0, expected: false },
        { change: 1, expected: false },
        { change: 5, expected: false },
        { change: 9.9, expected: false },
        { change: 10, expected: true },
        { change: 15, expected: true },
        { change: 25, expected: true },
        { change: 50, expected: true },
        { change: -5, expected: false },
        { change: -10, expected: true },
        { change: -20, expected: true },
      ];

      testCases.forEach(({ change, expected }) => {
        expect(isHighPriorityAlert(change)).toBe(expected);
      });
    });
  });
});
