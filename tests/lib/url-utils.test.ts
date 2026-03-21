import { describe, it, expect, beforeAll } from 'vitest';
import { canonicalUrl, sha256Hash } from '@lib/url-utils';

describe('url-utils', () => {
  beforeAll(async () => {
    if (typeof globalThis.crypto === 'undefined') {
      const nodeCrypto = await import('node:crypto');
      globalThis.crypto = nodeCrypto.webcrypto as any;
    }
  });

  describe('canonicalUrl', () => {
    it('strips fragments and hashes', () => {
      expect(canonicalUrl('https://example.com/page#section')).toBe('https://example.com/page');
      expect(canonicalUrl('https://example.com/page?ref=twitter')).toBe('https://example.com/page?ref=twitter');
      expect(canonicalUrl('https://example.com/page/#section')).toBe('https://example.com/page/');
      expect(canonicalUrl('invalid url')).toBe('invalid url');
    });
  });

  describe('sha256Hash', () => {
    it('returns a stable 64-character hex string', async () => {
      // In JS, depending on Node version, we might need to handle crypto.subtle availability for tests
      const hash1 = await sha256Hash('hello world');
      const hash2 = await sha256Hash('hello world');
      const hashDiff = await sha256Hash('hello world!');

      expect(hash1).toHaveLength(64);
      expect(hash1).toMatch(/^[a-f0-9]+$/);
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hashDiff);
    });
  });
});
