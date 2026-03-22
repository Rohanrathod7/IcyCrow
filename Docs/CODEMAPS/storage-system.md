[LAST UPDATED: 2026-03-22]

### Storage System & Atomic Transactions

* `src/lib/storage-mutex.ts` (Core Utility)
  - `StorageMutex`: Promise-chain based serialization per string key.
  - Prevents async Read-Modify-Write clobbering across Service Worker restarts.

* `src/lib/storage.ts` (Data Access Layer)
  - `getHighlights(urlHash)` -> Returns `HighlightsStore` from `chrome.storage.local`.
  - `updateHighlights(urlHash, updater)` -> 🔑 **Atomic Entry Point**
    - `mutex.withLock(key, ...)` -> `get` -> `updater(current)` -> `set`.
  - `appendChatMessage(spaceId, msg)` -> Mutex-protected chat history append.

* `chrome.storage.local` (Storage SSOT)
  - `highlights:${urlHash}` -> `Highlight[]`
  - `settings` -> `IcyCrowSettings`
  - `spaces` -> `SpacesStore`
  - `chatHistories:${spaceId}` -> `ChatMessage[]`

* `chrome.storage.session` (Runtime State)
  - `sessionState` -> `SessionState` (Restart counts, Crypto status).
