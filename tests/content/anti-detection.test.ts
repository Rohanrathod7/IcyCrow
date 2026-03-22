// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { typingDelay, jitter, humanType } from '../../src/content/anti-detection';

describe('Anti-Detection Utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('jitter', () => {
    it('returns a value within ±30% of base', () => {
      const base = 100;
      for (let i = 0; i < 100; i++) {
        const result = jitter(base);
        expect(result).toBeGreaterThanOrEqual(70);
        expect(result).toBeLessThanOrEqual(130);
      }
    });
  });

  describe('typingDelay', () => {
    it('resolves after a timeout within range', async () => {
      const promise = typingDelay(50, 100);
      
      // Advance by 49ms -> should not be resolved
      await vi.advanceTimersByTimeAsync(49);
      // We can't easily check "unresolved" state of a promise here without complex helpers, 
      // but we can check it resolves after the max.
      
      await vi.advanceTimersByTimeAsync(101);
      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('humanType', () => {
    it('types characters into an element with events', async () => {
      const el = document.createElement('div');
      el.contentEditable = 'true';
      document.body.appendChild(el);

      const inputSpy = vi.fn();
      el.addEventListener('input', inputSpy);

      const typePromise = humanType(el, 'Abc');
      
      // Should type 'A', then 'b', then 'c', with delays in between.
      // Total 3 chars. 
      for (let i = 0; i < 3; i++) {
        await vi.advanceTimersByTimeAsync(300); // Advance enough for max delay
      }
      
      await typePromise;
      
      expect(el.innerText).toBe('Abc');
      expect(inputSpy).toHaveBeenCalledTimes(3);
    });
  });
});
