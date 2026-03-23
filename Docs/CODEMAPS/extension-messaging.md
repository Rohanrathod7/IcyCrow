[LAST UPDATED: 2026-03-23]

### Extension Messaging & Zod Contracts

* `src/lib/zod-schemas.ts` (The Contract)
  - `InboundMessageSchema`: Discriminated union of all allowed `chrome.runtime` messages.
  - Payloads: `HIGHLIGHT_CREATE`, `HIGHLIGHTS_FETCH`, `HIGHLIGHT_DELETE`, `HIGHLIGHT_UPDATE`, `CRYPTO_UNLOCK`, `CRYPTO_LOCK`, `SCRAPE_CONTENT`, `AI_QUERY`, `AI_QUERY_STATUS`, `GEMINI_HEALTH_CHECK`, `EXPORT_WORKSPACE`, `IMPORT_WORKSPACE`, `SEMANTIC_SEARCH`, `SPACE_CREATE`, `ARTICLE_SAVE`, `WINDOW_AI_QUERY`, `DEBUG_EXPORT`, `NUKE_DATA`.

* `src/lib/messaging.ts` (Side Panel SW Bridge)
  - `sendToSW<T>(message)` -> `chrome.runtime.sendMessage`. Type-safe side panel -> SW relay.

* `src/background/index.ts` (The Router)
  - `chrome.runtime.onMessage.addListener` ->
    - 🛡️ Security: `sender.id === chrome.runtime.id` verification.
    - 🔍 Validation: `InboundMessageSchema.safeParse(request)`.
    - 🔀 Dispatch: `handleMessage()` -> Decomposed domain handlers (`handleHighlightMessage`, `handleCryptoMessage`, `handleScrapeMessage`, `handleAiMessage`).

* `src/lib/task-queue.ts` (The Dispatcher)
  - `TaskQueue.enqueue()` -> Adds task to FIFO queue (max 20). Returns `{ taskId, position }`.
  - `TaskQueue.processNext()` -> Runs next task. Syncs `consecutiveFailures` to `chrome.storage.session`.
  - Circuit Breaker: Opens after 3 consecutive failures (`isOpen: boolean`).

* Message Flows (S6/S13):
  - **Create**: `Content Script -> HIGHLIGHT_CREATE -> SW (updateHighlights) -> Local Storage`.
  - **Hydrate**: `DOMContentLoaded -> HIGHLIGHTS_FETCH -> SW (getHighlights) -> Content (restoreAnchor)`.
  - **Update**: `Side Panel (HighlightCard) -> HIGHLIGHT_UPDATE -> SW (updateHighlight) -> Local Storage`.
  - **Delete**: `Side Panel (HighlightCard) -> HIGHLIGHT_DELETE -> SW (deleteHighlight) -> Local Storage`.
  - **Sync**: `chrome.storage.onChanged -> handleStorageChange -> unwrapHighlight (ID Diff)`.

* Message Flows (S7):
  - **AI Query (S7/S11)**: `Side Panel -> AI_QUERY -> SW (taskQueue.enqueue) -> Gemini Tab (injectPrompt) -> AI_RESPONSE_STREAM -> Side Panel (ChatView)`.
  - **Health Check**: `Side Panel -> GEMINI_HEALTH_CHECK -> SW (sessionState.geminiTabId) -> { tabFound, selectors }`.
* Message Flows (S8):
  - **Save Article**: `Side Panel -> ARTICLE_SAVE -> SW (handleArticleMessage) -> Offscreen (EMBED_TEXT) -> SW (saveEmbedding)`.
  - **Semantic Search**: `Side Panel -> SEMANTIC_SEARCH -> SW (getAllArticles) -> Offscreen (SEMANTIC_SEARCH) -> SW (Relay)`.
* Message Flows (S9):
  - **Export**: `UI -> EXPORT_WORKSPACE -> SW (Validator) -> Offscreen (exportWorker) -> Serialise + AES-GCM + HMAC -> UI`.
  - **Import**: `UI -> IMPORT_WORKSPACE -> SW -> Offscreen (exportWorker) -> Verify HMAC + Decrypt -> IDB (Batched Restore) -> SW`.
