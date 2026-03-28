[LAST UPDATED: 2026-03-28]

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
  - Resilience: Wrapped in `<ErrorBoundary />` at the root.
  - View Switch: `activeView.value` drives `switch()` to render one of 5 views: Home, Search, Chat, Spaces, Highlights.
  - CSS: `./panel.css` (Glassmorphism + Bento Grid Design System)

* `src/side-panel/panel.css` (Design System)
  - Variables: `--bg-panel`, `--bg-card`, `--text-main`, `--text-dim`, `--accent-primary`, `--accent-secondary`, `--border-color`, `--shadow-glass`, `--glass-bg`.
  - Utility Classes: `.view-container`, `.bento-grid`, `.bento-item`, `.glass-card`, `.btn-primary`, `.input-glass`.
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
  - **Proactive Registry**: Fetches `manualGeminiTabId` and connected title on `useEffect` mount.
  - **Manual Override Mode**: Supports explicit tab focus via `MANUAL_REGISTER_BRIDGE`.
  - `ContextPicker.tsx` -> Listens to `chrome.tabs.query` to pick context for AI.
  - `SettingsView.tsx` -> Security Controls (Lock/Unlock/Nuke), Encrypted Backups (Export/Import), and Storage Usage Dashboard.
  - `ErrorBoundary.tsx` -> Global catch-all for render crashes. Provides "Friendly Crash" UI and reload logic.

* Testing (Side Panel)
  - `src/side-panel/integration.test.ts` -> E2E logic verification (Create -> Sync -> Chat).
  - `src/side-panel/components/ErrorBoundary.test.tsx` -> Resilience verification.

* Activation Chain:
  - `chrome.action.onClicked` (SW) -> `sidePanel.open({ windowId })` -> `side-panel.html` renders.
