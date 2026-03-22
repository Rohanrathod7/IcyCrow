[LAST UPDATED: 2026-03-22]

### Extension Messaging & Zod Contracts

* `src/lib/zod-schemas.ts` (The Contract)
  - `InboundMessageSchema`: Discriminated union of all allowed `chrome.runtime` messages.
  - Payloads: `HIGHLIGHT_CREATE`, `HIGHLIGHTS_FETCH`, `HIGHLIGHT_DELETE`, `HIGHLIGHT_UPDATE`, `CRYPTO_UNLOCK`, `CRYPTO_LOCK`.

* `src/background/index.ts` (The Router)
  - `chrome.runtime.onMessage.addListener` -> 
    - 🛡️ Security: `sender.id === chrome.runtime.id` verification.
    - 🔍 Validation: `InboundMessageSchema.safeParse(request)`.
    - 🔀 Dispatch: `handleMessage()` -> Decomposed domain handlers (`handleHighlightMessage`, `handleCryptoMessage`).

* Message Flows (S6):
  - **Create**: `Content Script -> HIGHLIGHT_CREATE -> SW (updateHighlights) -> Local Storage`.
  - **Hydrate**: `DOMContentLoaded -> HIGHLIGHTS_FETCH -> SW (getHighlights) -> Content (restoreAnchor)`.
  - **Sync**: `chrome.storage.onChanged -> handleStorageChange -> unwrapHighlight (ID Diff)`.
