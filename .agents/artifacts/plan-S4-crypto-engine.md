# 🏗️ Active Plan: S4 — Crypto Engine

## 1. Requirements & Success Criteria
* **Goal:** Implement a local-first, zero-dependency encryption engine for IcyCrow using the native Web Crypto API (`crypto.subtle`).
* **Success Criteria:**
  * [ ] Secure key derivation via PBKDF2 (100,000 iterations, SHA-256).
  * [ ] AES-GCM (256-bit) encryption/decryption with unique IVs.
  * [ ] `CryptoKey` is marked as `extractable: false` for security.
  * [ ] 30-minute auto-lock timer resets on every crypto operation.
  * [ ] Service Worker rehydrates unlock status from `chrome.storage.session`.
  * [ ] Passphrase strength enforced (8+ chars, 1 number, 1 special character).

## 2. Architecture & Dependencies
* **Affected Components:**
  * `[MODIFY] src/background/index.ts` (Message Router & Alarms)
  * `[CREATE] src/background/crypto-manager.ts` (Core Logic)
  * `[CREATE] src/lib/crypto-utils.ts` (Base64 & Buffer Helpers)
* **New Dependencies:** None (Native Web Crypto API only).

## 3. Implementation Phases (TDD Ready)

### Phase 1: Foundation & Buffer Utils
1. **[CREATE] `src/lib/crypto-utils.ts`**
   * **Action:** Implement `bufferToBase64`, `base64ToBuffer`, and `validatePassphraseStrength`. Avoid using Node.js `Buffer`.
   * **Verification (TDD):** Vitest cases for round-trip encoding and various passphrase strengths.
   * **Risk:** Low.

### Phase 2: CryptoManager Core
1. **[CREATE] `src/background/crypto-manager.ts`**
   * **Action:** Implement `CryptoManager` class (LLD §4.6) with `unlock()`, `lock()`, `encrypt()`, and `decrypt()`.
   * **Verification (TDD):** Mock `crypto.subtle` or use native global (`jsdom` supports it via `webcrypto`). Verify that `deriveKey` is called with correct iterations and that the key is non-extractable.
   * **Risk:** Medium (Complexity of Web Crypto async flows).

### Phase 3: Message Router & Session Sync
1. **[MODIFY] `src/background/index.ts`**
   * **Action:** Wire `CRYPTO_UNLOCK` and `CRYPTO_LOCK` message handlers. Implement `checkCryptoAutoLock()` triggered by the 1-minute alarm.
   * **Verification (TDD):** Integration tests sending messages to the router and verifying `chrome.storage.session` updates.
   * **Risk:** Low.

### Phase 4: Edge Cases & Auto-Lock
1. **[MODIFY] `src/background/crypto-manager.ts`**
   * **Action:** Finish the `checkAutoLock` logic and ensure `lastUsedAt` is updated on every `encrypt`/`decrypt` call.
   * **Verification (TDD):** Mock `Date.now()` to simulate 31 minutes passing and verify the key is wiped.
   * **Risk:** Med (Timer precision in SW environment).

## 4. Risks & Mitigations
* ⚠️ **High Risk:** Service Worker termination wipes the in-memory `CryptoKey`. -> **Mitigation:** The plan uses `chrome.storage.session` to track the status of the lock. While the key itself is lost on SW death, the keep-alive alarm (24s) prevents SW termination during active browser sessions. User must re-unlock on browser restart.
