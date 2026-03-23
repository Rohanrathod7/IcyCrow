# [LAST UPDATED: 2026-03-23]
# HIGHLIGHTS UI ARCHITECTURE (Epic S13)

## 🧩 Component Tree
* `HighlightsPanel.tsx` (Container)
  * Iterates `allHighlights` (Sorted by `createdAt` DESC)
  * Groups by `URL` -> `HighlightCard` list
* `HighlightCard.tsx` (Atomic Unit)
  * Props: `highlight: Highlight`, `isGhost?: boolean` (default: false)
  * Visuals: Snippet rendering, color-coded marker, `createdAt` relative time
  * Actions:
    * `Navigation`: `chrome.tabs.create` -> source URL
    * `Ghost Detection`: `isGhost` flag triggers ⚠️ UI
    * `CRUD`: 
      * Inline Note editing -> Debounced/Blur `HIGHLIGHT_UPDATE`
      * Delete -> `confirm()` -> `HIGHLIGHT_DELETE`

## 💾 Storage & Data Flow
* `chrome.storage.local`: Keys `highlights:<URL_HASH>`
* `store.ts` -> `allHighlights` (Signal)
  * `syncAllHighlights()`: Scans all `highlights:*` keys and merges
  * `chrome.storage.onChanged`: Triggers incremental re-sync
* `Hashing`: `lib/url-utils.ts` -> `crypto.subtle.digest('SHA-256', url)`

## 📨 Message Chains
* `HIGHLIGHT_UPDATE` (Payload: `{ highlightId, updates }`):
  * `HighlightCard` -> `chrome.runtime.sendMessage` -> `background/service-worker.ts`
* `HIGHLIGHT_DELETE` (Payload: `{ highlightId }`):
  * `HighlightCard` -> `chrome.runtime.sendMessage` -> `background/service-worker.ts`
