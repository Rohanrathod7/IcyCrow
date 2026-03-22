// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scrapePageContent, cleanupText } from '../../src/content/scraper';

describe('Content Scraper', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('cleanupText', () => {
    it('removes script and style tags', () => {
      const input = 'Hello <script>alert(1)</script> <style>.bg{color:red}</style> World';
      // Note: cleanupText works on string content, usually parsed from innerText or similar
      // But if we use a DOM-based cleaner, we'll test it here.
      const result = cleanupText(input);
      expect(result).toContain('Hello');
      expect(result).toContain('World');
      expect(result).not.toContain('alert(1)');
      expect(result).not.toContain('.bg{color:red}');
    });

    it('collapses multiple whitespaces and newlines', () => {
      const input = 'Line 1\n\n\n   Line 2    Line 3';
      const result = cleanupText(input);
      expect(result).toBe('Line 1 Line 2 Line 3');
    });

    it('trims leading and trailing whitespace', () => {
      const input = '   Internal content   ';
      const result = cleanupText(input);
      expect(result).toBe('Internal content');
    });
  });

  describe('scrapePageContent', () => {
    it('extracts text from simple page', () => {
      document.title = 'Test Page';
      document.body.innerHTML = '<h1>Header</h1><p>Paragraph 1</p><div>Paragraph 2</div>';
      
      const result = scrapePageContent();
      expect(result.title).toBe('Test Page');
      expect(result.content).toContain('Header');
      expect(result.content).toContain('Paragraph 1');
      expect(result.content).toContain('Paragraph 2');
      expect(result.byteLength).toBeGreaterThan(0);
    });

    it('excludes hidden elements', () => {
      document.body.innerHTML = `
        <div>Visible</div>
        <div style="display: none;">Hidden Display</div>
        <div style="visibility: hidden;">Hidden Visibility</div>
        <div aria-hidden="true">Hidden Aria</div>
      `;
      
      const result = scrapePageContent();
      expect(result.content).toContain('Visible');
      expect(result.content).not.toContain('Hidden Display');
      expect(result.content).not.toContain('Hidden Visibility');
      // aria-hidden might still be in innerText but we should check if our cleaner handles it
    });
  });
});
