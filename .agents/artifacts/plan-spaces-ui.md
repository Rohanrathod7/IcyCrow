# 🏗️ Active Plan: Epic S12 — Side Panel Spaces UI

## 1. Requirements & Scope
* **Goal:** Technical implementation of "Spaces" (tab groups) management in the Side Panel. Allows users to save current windows as named spaces, restore them, and manage them locally.
* **Blueprint Alignment:** Aligned with `Execution_Plan.md` Slice S12 and `LLD.md` §1.3 & §2.4.
* **Out of Scope:** Automatic syncing across devices (focus is on 100% local-first storage).

## 2. Architecture & Dependencies
* **Loaded Constraints:** `mv3-patterns`, `preact-ui`, `planner`.
* **New Dependencies:** None (uses existing `chrome.tabs` and `chrome.storage.local`).

## 3. Implementation Phases (TDD Ready)

### Phase 1: Space Manager & Messaging
* **Action:**
  - `[CREATE] src/background/managers/space-manager.ts`: Controller for space logic.
    - `createSpace(name, color, captureCurrentTabs)`: Uses `chrome.tabs.query` to capture metadata (url, title, favicon).
    - `restoreSpace(spaceId)`: Uses `chrome.tabs.create` with `discarded: true` for performance.
  - `[MODIFY] src/background/index.ts`: Wire `SPACE_CREATE`, `SPACE_RESTORE`, `SPACE_DELETE`, `SPACE_UPDATE` to the manager.
* **Required Tests:**
  - Mock `chrome.tabs.query` to verify tab serialization into the `SpaceTab` structure.
  - Mock `chrome.storage.local.set` to verify the space is saved with a valid UUID.
  - Verify `restoreSpace` calls `chrome.tabs.create` for each tab in the space.

### Phase 2: Spaces UI — List & Navigation
* **Action:**
  - `[CREATE] src/side-panel/components/SpacesView.tsx`: Container view for the Spaces tab.
  - `[CREATE] src/side-panel/components/SpaceCard.tsx`: Visual card for a space showing name, color, and tab count.
* **Required Tests:**
  - Render `SpacesView` with a mocked `SpacesStore` and verify all space cards appear.
  - Verify clicking "Restore" on a card dispatches the `SPACE_RESTORE` message.

### Phase 3: Space Creation Flow
* **Action:**
  - `[CREATE] src/side-panel/components/SpaceForm.tsx`: Modal or inline form to name a space, pick a color (hex), and toggle "Capture current tabs".
  - `[MODIFY] src/side-panel/components/SpacesView.tsx`: Integrate the form.
* **Required Tests:**
  - Verify form validation (name required).
  - Verify submitting the form dispatches `SPACE_CREATE` with correct payload.

### Phase 4: Favorited & Dynamic Updates
* **Action:**
  - `[MODIFY] src/side-panel/components/SpaceCard.tsx`: Add a favicon preview strip (limit to 5 icons).
  - `[MODIFY] src/side-panel/panel.css`: Add styles for the Spaces Bento Grid and color badges.
* **Required Tests:**
  - Verify favicon rendering for valid URLs and fallback for missing icons.
  - Verify the list updates reactively when `spaces` signal in `store.ts` changes.

## 4. Risks & Mitigations
* ⚠️ **[High Risk]:** Restoring 50+ tabs simultaneously crashing the browser -> **Mitigation:** Open tabs in `discarded: true` state (Chrome only loads them on click) and use a small delay between `chrome.tabs.create` calls if count > 20.
* ⚠️ **[Med Risk]:** Favicon URLs becoming stale or invalid -> **Mitigation:** Use a CSS fallback (colored block with first letter of title) for broken icons.
