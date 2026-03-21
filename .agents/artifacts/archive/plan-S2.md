# 🏗️ Active Plan: S2 — Storage Layer

## 1. Requirements & Success Criteria
* **Goal:** Implement the complete local storage infrastructure using `chrome.storage.local` and IndexedDB (via `idb`), including migrations, a promise-based write mutex, and URL hashing utilities.
* **Success Criteria:**
  * [ ] IDB opens at version 1 with all 6 stores and correct indexes defined in LLD.
  * [ ] Write + read round-trip works for every store (`articles`, `embeddings`, `settings`, `highlights`, etc).
  * [ ] Mutex test proves 100 concurrent writes to the same key produce zero data loss.
  * [ ] `sha256Hash` function correctly hashes a URL and `canonicalUrl` handles stripping fragments.
  * [ ] `npx vitest run tests/lib/*` passes for mutex, metrics, URL hashing.

## 2. Architecture & Dependencies
* **Affected Components:**
  * [NEW] `src/lib/idb-migrations.ts`
  * [NEW] `src/lib/url-utils.ts`
  * [NEW] `src/lib/storage-mutex.ts`
  * [NEW] `src/lib/storage.ts`
  * [NEW] `tests/lib/storage-mutex.test.ts`
  * [NEW] `tests/lib/idb-migrations.test.ts`
  * [NEW] `tests/lib/url-utils.test.ts`
  * [NEW] `tests/lib/storage.test.ts`
  * [MODIFY] `package.json`
* **New Dependencies:**
  * `idb` — IndexedDB wrapper
  * `fake-indexeddb` (dev) — Allows real integration testing of IDB in Vitest Node.js environment.

## 3. Implementation Steps (TDD Ready)

### Phase 1: Dependencies & Utilities
1. **[Install IDB & Polyfills]** (`package.json`)
   * **Action:** `CREATE` - run `npm install idb` and `npm install -D fake-indexeddb`
   * **Verification (TDD):** Verify `import { openDB } from 'idb'` doesn't throw.
   * **Risk:** Low

2. **[URL Utils]** (`src/lib/url-utils.ts`, `tests/lib/url-utils.test.ts`)
   * **Action:** `CREATE` - export `async function sha256Hash(text: string): Promise<string>` using Node `crypto` or Web Crypto API fallback. Export `function canonicalUrl(url: string): string` to strip fragments/hashes.
   * **Verification (TDD):** Write Vitest unit tests verifying SHA256 returns stable 64-char hex strings and `canonicalUrl` normalises URLs correctly.
   * **Risk:** Low

### Phase 2: Synchronization primitives
3. **[Storage Mutex]** (`src/lib/storage-mutex.ts`, `tests/lib/storage-mutex.test.ts`)
   * **Action:** `CREATE` - implement a `Mutex` class or `withMutex<T>(key: string, task: () => Promise<T>)` function that queues promises sequentially per key to prevent `chrome.storage` write-clobbering.
   * **Verification (TDD):** Vitest test simulating 100 concurrent increments of a counter. Total should equal exactly 100.
   * **Risk:** High (concurrency bugs are hard to trace).

### Phase 3: IndexedDB Schema
4. **[IDB Migrations]** (`src/lib/idb-migrations.ts`, `tests/lib/idb-migrations.test.ts`)
   * **Action:** `CREATE` - define `MIGRATIONS` map. v1 creates `articles`, `embeddings`, `annotations`, `taskQueue`, `onnxModelCache`, and `backupManifest` stores with correct `keyPath` and indexes. Export `initDB()`.
   * **Verification (TDD):** Vitest test (using `fake-indexeddb`) to verify DB opens and object stores exist.
   * **Risk:** Med.

### Phase 4: Unified Storage API
5. **[Storage API]** (`src/lib/storage.ts`, `tests/lib/storage.test.ts`)
   * **Action:** `CREATE` - export functions: `getSettings()`, `setSettings()`, `getHighlights(urlHash)`, `setHighlights(urlHash, data)` (mutex wrapped), `getChatHistory(spaceId)`, `appendChatMessage(spaceId, msg)`, `getSpaces()`, `setSpaces()`.
   * **Action:** `CREATE` - IDB wrappers: `getArticle()`, `saveArticle()`, `getEmbedding()`, `saveEmbedding()`.
   * **Verification (TDD):** Vitest env with mocked `chrome.storage.local`. Test read/write roundtrips and ensure IDB hits `fake-indexeddb` seamlessly.
   * **Risk:** Med.

## 4. Testing Strategy
* **Unit:** Extensive Vitest suites for URL Utils, Mutex logic (simulated async delays), and IDB schema migrations.
* **Integration:** All IDB wrappers hit a real in-memory `fake-indexeddb` instance to prove logic without browser dependency. Unified `storage.ts` functions mapped against mock `chrome.storage.local`.

## 5. Risks & Mitigations
* ⚠️ **Risk:** Vitest runs in Node.js, which lacks `indexedDB`. -> **Mitigation:** Use `fake-indexeddb` to mock the global browser `indexedDB` object.
* ⚠️ **Risk:** `chrome.storage.local` is async and lacks transaction safety, meaning race conditions on saving lists. -> **Mitigation:** Strict usage of the `storage-mutex.ts` lock specifically for appends (e.g. Chat History, Highlights).
