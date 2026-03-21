import { describe, it, expect } from 'vitest';
// @ts-ignore - file does not exist yet (RED phase)
import { bufferToBase64, base64ToBuffer, validatePassphraseStrength } from '../../src/lib/crypto-utils';

describe('Crypto Utilities', () => {
  describe('Base64 Conversions', () => {
    it('should convert Buffer to Base64 and back', () => {
      const original = new TextEncoder().encode('Hello IcyCrow');
      const base64 = bufferToBase64(original.buffer);
      expect(typeof base64).toBe('string');
      
      const restored = base64ToBuffer(base64);
      expect(new Uint8Array(restored)).toEqual(original);
    });

    it('should handle empty buffers', () => {
      const empty = new Uint8Array(0);
      const base64 = bufferToBase64(empty.buffer);
      expect(base64).toBe('');
      expect(base64ToBuffer('').byteLength).toBe(0);
    });
  });

  describe('Passphrase Strength Validation', () => {
    it('should accept strong passphrases', () => {
      expect(validatePassphraseStrength('StrongP@ss123')).toBe(true);
      expect(validatePassphraseStrength('Another!_12345')).toBe(true);
    });

    it('should reject short passphrases', () => {
      expect(validatePassphraseStrength('Short1!')).toBe(false); // < 8
    });

    it('should reject passphrases without numbers', () => {
      expect(validatePassphraseStrength('NoNumber!@#')).toBe(false);
    });

    it('should reject passphrases without special characters', () => {
      expect(validatePassphraseStrength('NoSpecialChar123')).toBe(false);
    });
  });
});
