[LAST UPDATED: 2026-03-21]

### Content Script Architecture (S5)

* `src/content/index.ts` (Entry Point)
  - `document.addEventListener('mouseup'|'keyup')` -> `handleSelectionChange()`
  - `chrome.runtime.onMessage('COMMAND_HIGHLIGHT')` -> `performHighlight()`
  - `chrome.storage.onChanged` -> `handleStorageChange()` -> 🔄 Live Sync Deletion
  - `restoreHighlightsFromStorage()` -> `withRetry()` -> 🌊 Page Hydration
  - `teardown()` -> Removes all event listeners (leak-safe)

* `src/content/index.ts` (Resilience Logic)
  - `withRetry(msgFn)` -> 2 attempts with 1s delay to survive SW cold start latency.
  - `handleStorageChange(changes)` -> URL-specific key check -> ID set difference -> `unwrapHighlight()`.
    
* `src/content/ui-root.tsx` (Shadow DOM UI Encapsulation)
  * `document.createElement('div#icycrow-extension-root')` -> `.attachShadow({ mode: 'open' })`
  * CSS Isolation: `:host { all: initial; }` | `* { box-sizing: border-box !important; }`
  * `render(<HighlightTooltip />)` bounded safely inside Shadow Root -> `#icycrow-mount`

* `src/content/components/HighlightTooltip.tsx` (Preact Signals State)
  * State: `@preact/signals` -> `tooltipVisible`, `tooltipPos`, `selectedColor`
  * Math: `tooltipPos.value` compensated via `rect + window.scrollY/X`
  * Action: `onHighlight()` -> `captureAnchor(selection)` -> `wrapRange()`

* `src/content/anchoring.ts` (4-Tier Text Anchoring Cascade)
  * `captureAnchor()` -> Serializes offsets, surrounding text, XPath, and CSS selectors.
  * `restoreAnchor(anchor)` execution chain:
    1. Exact Match -> `TextQuoteSelector` index lookup
    2. DOM Path -> `XPath Fallback` (`document.evaluate`)
    3. Semantic Path -> `CSS Fallback` (`document.querySelector`)
    4. Fuzzy Search -> `Levenshtein` window constrained to ~1000 chars around the fallback node's text.

* `src/content/highlighter.ts` (DOM Node Wrapping)
  * Fast path: `range.surroundContents(<mark>)`
  * Cross-element path: `TreeWalker (NodeFilter.SHOW_TEXT)` -> extract text nodes -> slice nodeRanges -> `surroundContents(<mark>)`

* `src/content/state.ts` (Shared Signals)
  * `tooltipVisible: signal<boolean>(false)`
  * `tooltipPos: signal<{x,y}>({x:0,y:0})`
  * `selectedColor: signal<HighlightColor>('yellow')`

* `src/content/tooltip-logic.ts` (Coordinate Math)
  * `updateTooltipPosition(rect)` -> `tooltipPos.value = { x: rect.left + rect.width/2 + scrollX, y: rect.top + scrollY }`

### Hotkey Wiring (S5 Phase 4)

* `manifest.json`
  * `content_scripts[0].js` -> `src/content/index.ts` | `matches: ["<all_urls>"]`
  * `commands["highlight-selection"]` -> `Ctrl+Shift+H` / `MacCtrl+Shift+H`

* `src/background/index.ts` (Command Relay)
  * `chrome.commands.onCommand('highlight-selection')` -> `chrome.tabs.sendMessage(tabId, { type: 'COMMAND_HIGHLIGHT' })`
  * Content script receives via `chrome.runtime.onMessage` -> `performHighlight()`
