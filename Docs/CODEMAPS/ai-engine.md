[LAST UPDATED: 2026-03-23]

### S14: Native AI Bridge & Context Window

* **AiManager** (`src/background/managers/ai-manager.ts`)
  - `checkCapabilities()` -> `window.ai.assistant.capabilities()` detection (readily/after-download).
  - `queryBuiltIn(prompt, onChunk)` -> Proximity proxy for native Nano streaming.
  - `formatContext(history, prompt)` -> **Sliding Window Context**: Serializes last 10 messages into conversational memory.

### S7: AI Context Engine

* **Content Scraper** (`src/content/scraper.ts`)
  - `scrapePageContent()` -> Returns `{ url, title, content, byteLength }`.

* **Context Builder** (`src/lib/context-builder.ts`)
  - `buildContext(tabIds)` -> Aggregates scrape results across multiple tabs.
  - `truncateToBudget(context, 50_000)` -> Truncates to 50KB token budget.

* **Gemini Selector Map** (`src/lib/gemini-selectors.ts`)
  - `GEMINI_SELECTORS.inputField[]` -> Fallback CSS selectors for Gemini prompt input.
  - `GEMINI_SELECTORS.sendButton[]` -> Fallback CSS selectors for Gemini send button.
  - `GEMINI_SELECTORS.responseContainer[]` -> Fallback CSS selectors for Gemini response.

* **Anti-Detection** (`src/content/anti-detection.ts`)
  - `jitter(n)` -> Returns ±20% random offset.
  - `typingDelay()` -> Waits 80–180ms (simulates keypress timing).
  - `humanType(el, text)` -> Dispatches `InputEvent` + `KeyboardEvent` per character with jitter.

* **Gemini Bridge** (`src/content/gemini-bridge.ts`)
  - `findSelector(selectors[])` -> Returns first matching `HTMLElement | null`.
  - `injectPrompt(prompt)` -> `humanType(input)` -> `sendBtn.click()`.
  - `scrapeResponse(taskId)` -> `MutationObserver` on `responseContainer`.
    - Streams: `AI_RESPONSE_STREAM { taskId, chunk, done: false }` on each mutation.
    - Stability: `1.5s` of no mutations + send button re-enabled -> `done: true`.
    - Safety: `maxDurationTimer` (30s) -> forces `done: true` if Gemini hangs.

* **Gemini Tab Detector** (`src/background/gemini-detector.ts`)
  - `findGeminiTab(urlPattern)` -> `chrome.tabs.query({ url })` -> Returns `tabId | null`.
  - `watchGeminiTab(urlPattern)` -> Registers `onUpdated` + `onRemoved` listeners.
    - Syncs `sessionState.geminiTabId` to `chrome.storage.session` on tab change.

* **Task Queue** (`src/lib/task-queue.ts`)
  - Class `TaskQueue` with FIFO array, `maxDepth` (20) back-pressure, circuit breaker (3 failures).
  - Failure counter persisted to `chrome.storage.session.consecutiveFailures` (SW-sleep safe).
  - Singleton export: `export const taskQueue = new TaskQueue()`.

* SW AI Engine Boot Flow:
  - SW Start -> `watchGeminiTab('https://gemini.google.com/*')` *(registers listeners immediately)*.
  - SW Start -> `boot()` -> increments `swRestartCount`, resets `cryptoKeyUnlocked: false`.
  - `AI_QUERY` received -> `taskQueue.enqueue(task)` -> returns `{ taskId, position }` to caller.
  - Task runs -> `chrome.tabs.sendMessage(geminiTabId, injectPrompt)` -> `scrapeResponse` streams back.

### S8: Offscreen AI Engine

* **Offscreen Host** (`src/offscreen/offscreen.ts`)
  - `initModel()` -> Cache-aside loader:
    - 1. Check `getCachedModel('all-MiniLM-L6-v2')` (IDB).
    - 2. If miss: `fetch('/models/...')` -> `cacheModel()`.
  - `withTimeout(promise, 30_000)` -> Prevents inference hangs.
  - Handlers: `EMBED_TEXT`, `BATCH_EMBED`, `SEMANTIC_SEARCH`, `EXPORT_WORKSPACE`, `IMPORT_WORKSPACE`.
  - Security S9: password strength validation (8+ chars, digit, special), 50MB export limit.

* **Binary Format (`.icycrow`)**
  - Layout: `[MAGIC(4)][VERSION(1)][SALT(16)][IV(12)][JSON_LEN(4)][CIPHERTEXT(N)][HMAC(32)]`
  - Crypto: PBKDF2 (100k iterations) -> AES-GCM (256-bit) + HMAC-SHA256.

* **Inference Pipeline** (`src/lib/embedding-worker.ts`)
  - `embed(text, session)` -> Returns `Float32Array(384)`.
  - `topK(queryVector, storedVectors, k)` -> Cosine similarity ranking.
