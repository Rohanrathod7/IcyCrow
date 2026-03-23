[LAST UPDATED: 2026-03-23]

### Side Panel Shell & Navigation (Epic S10)

* `side-panel.html` (Entry Point)
  - Script: `src/side-panel/index.tsx`
  - Mounts: `<App />`

* `src/side-panel/index.tsx`
  - `render(<App />, #app)` -> Bootstraps Preact tree into side-panel DOM.

* `src/side-panel/store.ts` (Reactive State - Preact Signals)
  - `activeView: Signal<ViewType>` -> Drives view switching. Default: `'home'`.
  - `highlights: Signal<Highlight[]>` -> Global highlights cache.
  - `spaces: Signal<SpacesStore>` -> Active workspace list.
  - `searchResults: Signal<SearchResult[]>` -> Populated by `SEMANTIC_SEARCH` SW response.
  - `isLoading: Signal<boolean>` -> Global loading HUD indicator.
  - `error: Signal<string | null>` -> Global error banner. Set by view error paths.
  - `chatMessages: Signal<ChatMessage[]>` -> Current session chat history.
  - `selectedContextTabs: Signal<TabInfo[]>` -> Tabs selected for AI context.

* `src/lib/messaging.ts` (Type-Safe SW Bridge)
  - `sendToSW<T>(message)` -> `chrome.runtime.sendMessage(message) as Promise<T>`

* `src/side-panel/App.tsx` (Shell / Layout)
  - Renders: `isLoading` overlay, `error` banner, `<NavBar />`, and the active view.
  - View Switch: `activeView.value` drives `switch()` to render one of 5 views: Home, Search, Chat, Spaces, Highlights.
  - CSS: `./panel.css` (Glassmorphism Design System)

* `src/side-panel/panel.css` (Design System)
  - Variables: `--glass-bg`, `--glass-border`, `--accent-primary`, `--text-main`, `--text-dim`.
  - Utility Classes: `.view-container`, `.card`, `.section-title`, `.btn-primary`, `.input-glass`, `.flex-row`, `.text-dim`.
  - Overlays: `.loading-overlay`, `.error-banner`.

* View Components (Signal-Driven, No Props)
  - `NavBar.tsx` -> `activeView.value = viewId` on click. Includes 'Highlights' tab.
  - `HomeView.tsx` -> `chrome.storage.local.get(null)` + filter `highlights:` keys -> `highlights.value = [...]`.
  - `SearchView.tsx` -> `form.submit` -> `sendToSW({ type: 'SEMANTIC_SEARCH' })` -> `searchResults.value = [...]`.
  - `HighlightsPanel.tsx` -> Unified highlights view. Groups by URL. Renders `HighlightCard`. Logic: `syncAllHighlights()` on mount.
  - `HighlightCard.tsx` -> Snippet unit. Handles `HIGHLIGHT_UPDATE` (blur) and `HIGHLIGHT_DELETE` (click).
  - `SpacesView.tsx` -> `chrome.storage.local.get('spaces')` -> `spaces.value`. Create via `sendToSW({ type: 'SPACE_CREATE' })`.
  - `ChatView.tsx` -> Main chat container. Logic: `AI_QUERY`/`WINDOW_AI_QUERY` dispatch + `AI_RESPONSE_STREAM` listener. Supports engine selection (Local vs Cloud).
  - `ChatMessage.tsx` -> Renders Markdown content via `marked.js` + `DOMPurify`. Syntax highlighting via `highlight.js`.
  - `ChatInput.tsx` -> Auto-expanding `textarea` with submit handling.
  - `ContextPicker.tsx` -> Listens to `chrome.tabs.query` to pick context for AI.
  - `SettingsView.tsx` -> Export: `sendToSW({ type: 'EXPORT_WORKSPACE' })` -> `URL.createObjectURL(blob)` -> Download. Import: File -> `arrayBuffer()` -> `sendToSW({ type: 'IMPORT_WORKSPACE' })`.

* Activation Chain:
  - `chrome.action.onClicked` (SW) -> `sidePanel.open({ windowId })` -> `side-panel.html` renders.
