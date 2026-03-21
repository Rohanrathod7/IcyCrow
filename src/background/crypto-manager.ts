import { type SessionState } from '@lib/types';

export class CryptoManager {
  private key: CryptoKey | null = null;
  private lastUsedAt: number = 0;
  private autoLockMs: number = 30 * 60 * 1000; // 30 min default

  /** Derive key from passphrase. Key is NON-EXTRACTABLE. */
  async unlock(passphrase: string): Promise<boolean> {
    const salt = await this.getOrCreateSalt();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(passphrase),
      'PBKDF2',
      false, // non-extractable
      ['deriveKey'],
    );

    this.key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt as any, iterations: 100_000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false, // non-extractable — CRITICAL
      ['encrypt', 'decrypt'],
    );

    this.lastUsedAt = Date.now();
    await this.updateSessionState(true);
    return true;
  }

  /** Wipe key from memory. User must re-enter passphrase. */
  async lock(): Promise<void> {
    this.key = null;
    this.lastUsedAt = 0;
    await this.updateSessionState(false);
  }

  /** Called by crypto-autolock alarm every 1 minute */
  async checkAutoLock(): Promise<void> {
    if (this.key && (Date.now() - this.lastUsedAt > this.autoLockMs)) {
      await this.lock();
    }
  }

  /** Encrypt a single record. Atomic — safe against SW termination. */
  async encrypt(data: string): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> {
    if (!this.key) throw new Error('ENCRYPTION_LOCKED');
    this.lastUsedAt = Date.now();

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as any },
      this.key,
      new TextEncoder().encode(data),
    );

    return { ciphertext, iv };
  }

  /** Decrypt a single record. */
  async decrypt(ciphertext: ArrayBuffer, iv: Uint8Array): Promise<string> {
    if (!this.key) throw new Error('ENCRYPTION_LOCKED');
    this.lastUsedAt = Date.now();

    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as any },
      this.key,
      ciphertext,
    );

    return new TextDecoder().decode(plaintext);
  }

  private async updateSessionState(unlocked: boolean): Promise<void> {
    const result = await chrome.storage.session.get('sessionState');
    const sessionState: SessionState = (result.sessionState as SessionState) || {};
    
    await chrome.storage.session.set({
      sessionState: {
        ...sessionState,
        cryptoKeyUnlocked: unlocked,
        cryptoKeyLastUsedAt: unlocked ? new Date().toISOString() : null,
      },
    });
  }

  private async getOrCreateSalt(): Promise<Uint8Array> {
    const { encryptionSalt } = await chrome.storage.local.get('encryptionSalt');
    if (Array.isArray(encryptionSalt)) return new Uint8Array(encryptionSalt);

    const salt = crypto.getRandomValues(new Uint8Array(16));
    await chrome.storage.local.set({ encryptionSalt: Array.from(salt) });
    return salt;
  }
}

export const cryptoManager = new CryptoManager();
