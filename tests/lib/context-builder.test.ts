import { describe, it, expect } from 'vitest';
import { buildContext, truncateToBudget } from '../../src/lib/context-builder';
import { ScrapedTab } from '../../src/lib/types';

describe('Context Builder', () => {
  const mockTabs: ScrapedTab[] = [
    {
      url: 'https://example.com/1',
      title: 'Page 1',
      content: 'Content of page 1. This is a moderately long sentence to test merging.',
      byteLength: 68
    },
    {
      url: 'https://example.com/2',
      title: 'Page 2',
      content: 'Content of page 2. Another piece of information.',
      byteLength: 48
    }
  ];

  describe('buildContext', () => {
    it('merges multiple tabs with delimiters', () => {
      const result = buildContext(mockTabs);
      expect(result).toContain('SOURCE: https://example.com/1');
      expect(result).toContain('TITLE: Page 1');
      expect(result).toContain('Content of page 1');
      expect(result).toContain('---');
      expect(result).toContain('SOURCE: https://example.com/2');
      expect(result).toContain('Content of page 2');
    });

    it('returns empty string for empty tab array', () => {
      expect(buildContext([])).toBe('');
    });
  });

  describe('truncateToBudget', () => {
    it('does not truncate if under budget', () => {
      const text = 'Short text';
      expect(truncateToBudget(text, 100)).toBe(text);
    });

    it('truncates at character boundary if over budget', () => {
      const text = '1234567890';
      const result = truncateToBudget(text, 5);
      expect(result).toBe('12345');
      expect(result.length).toBe(5);
    });

    it('defaults to 50KB if no limit provided', () => {
      const longText = 'a'.repeat(60000);
      const result = truncateToBudget(longText);
      expect(result.length).toBe(51200); // 50 * 1024
    });
  });
});
