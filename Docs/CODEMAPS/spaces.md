[LAST UPDATED: 2026-04-03]

### Space Management & Tab Serialization (Epic S12)

* `src/background/managers/space-manager.ts` (The Orchestrator)
  - `createSpace(name, color, capture)` -> Serializes current tabs via `serializeTab()`.
  - `serializeTab(tab)` -> Captures URL, Title, and converts `favIconUrl` to **Base64 Data URI** for offline persistence.
  - `restoreSpace(spaceId, createGroup)` -> Opens tabs with `discarded: true`. Optionally creates `chrome.tabGroups`.
  - `deleteSpace(spaceId)` -> Removes from `chrome.storage.local`.

* `src/side-panel/components/SpacesView.tsx` (List View)
  - Stores: `spaces` Signal from `../store`.
  - Renders: `<SpaceCard />` per entry.
  - Action: `+ New` triggers `<SpaceForm />` modal.

* `src/side-panel/components/SpaceCard.tsx` (Atomic UI)
  - Renders: Favicon strip (first 5 tabs) + tab count badge.
  - Action: `Restore` -> `sendToSW({ type: 'SPACE_RESTORE' })`.

* `src/side-panel/components/SpaceForm.tsx` (Creation Flow)
  - Inputs: Name (validated), Color picker, Capture toggle, Tab Group toggle.
  - Logic: **The Janitor** (Map-based deduplication by URL) processes captured tabs before submission.
  - Action: `Create` -> `sendToSW({ type: 'SPACE_CREATE', payload: { ..., tabs: uniqueTabs } })`.

* Data Flow:
  - `UI: SpaceForm -> sendToSW('SPACE_CREATE') -> SW: SpaceManager.createSpace -> chrome.storage.local`.
  - `UI: SpaceCard -> sendToSW('SPACE_RESTORE') -> SW: SpaceManager.restoreSpace -> chrome.tabs.create`.
