import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// @ts-ignore - file does not exist yet (RED phase)
import { CryptoManager } from '../../src/background/crypto-manager';

// Mock chrome APIs
const mockStorage: Record<string, any> = {};
global.chrome = {
  storage: {
    local: {
      get: vi.fn(async (keys: string | string[]) => {
        if (typeof keys === 'string') return { [keys]: mockStorage[keys] };
        return Object.fromEntries(keys.map(k => [k, mockStorage[k]]));
      }),
      set: vi.fn(async (items: Record<string, any>) => {
        Object.assign(mockStorage, items);
      })
    },
    session: {
      get: vi.fn(async (keys: string | string[]) => {
        if (typeof keys === 'string') return { [keys]: mockStorage[keys] };
        return Object.fromEntries(keys.map(k => [k, mockStorage[k]]));
      }),
      set: vi.fn(async (items: Record<string, any>) => {
        Object.assign(mockStorage, items);
      })
    }
  }
} as any;

describe('CryptoManager', () => {
  let manager: CryptoManager;

  beforeEach(() => {
    vi.clearAllMocks();
    for (const key in mockStorage) delete mockStorage[key];
    manager = new CryptoManager();
  });

  describe('unlock', () => {
    it('should derive a non-extractable key and update session state', async () => {
      const unlocked = await manager.unlock('StrongP@ss123');
      expect(unlocked).toBe(true);
      expect(mockStorage.sessionState?.cryptoKeyUnlocked).toBe(true);
      expect(mockStorage.encryptionSalt).toBeDefined();
    });
  });

  describe('encryption/decryption', () => {
    it('should perform round-trip encryption', async () => {
      await manager.unlock('StrongP@ss123');
      const secret = 'Top Secret Data';
      const { ciphertext, iv } = await manager.encrypt(secret);
      
      expect(ciphertext).toBeInstanceOf(ArrayBuffer);
      expect(iv).toBeInstanceOf(Uint8Array);
      
      const decrypted = await manager.decrypt(ciphertext, iv);
      expect(decrypted).toBe(secret);
    });

    it('should throw if encryption is attempted while locked', async () => {
      await expect(manager.encrypt('data')).rejects.toThrow('ENCRYPTION_LOCKED');
    });

    it('should throw if decryption is attempted while locked', async () => {
      const buf = new ArrayBuffer(10);
      const iv = new Uint8Array(12);
      await expect(manager.decrypt(buf, iv)).rejects.toThrow('ENCRYPTION_LOCKED');
    });
  });

  describe('lock', () => {
    it('should wipe the key and update session state', async () => {
      await manager.unlock('StrongP@ss123');
      await manager.lock();
      expect(mockStorage.sessionState?.cryptoKeyUnlocked).toBe(false);
      await expect(manager.encrypt('data')).rejects.toThrow('ENCRYPTION_LOCKED');
    });
  });

  describe('auto-lock', () => {
    it('should auto-lock after specified minutes', async () => {
      vi.useFakeTimers();
      await manager.unlock('StrongP@ss123');
      
      // Simulate 31 minutes passing
      vi.advanceTimersByTime(31 * 60 * 1000);
      
      await manager.checkAutoLock();
      expect(mockStorage.sessionState?.cryptoKeyUnlocked).toBe(false);
      vi.useRealTimers();
    });

    it('should NOT auto-lock if used within threshold', async () => {
      vi.useFakeTimers();
      await manager.unlock('StrongP@ss123');
      
      vi.advanceTimersByTime(15 * 60 * 1000);
      await manager.encrypt('tickle'); // Reset lastUsedAt
      
      vi.advanceTimersByTime(20 * 60 * 1000);
      await manager.checkAutoLock();
      
      expect(mockStorage.sessionState?.cryptoKeyUnlocked).toBe(true);
      vi.useRealTimers();
    });
  });
});
