# 🏗️ Active Plan: Epic S12 — Side Panel Spaces UI [REVISED v1.1]

## 1. Requirements & Scope
* **Goal:** Technical implementation of "Spaces" (tab groups) management in the Side Panel. Allows users to save current windows as named spaces, restore them, and manage them locally.
* **Blueprint Alignment:** Aligned with `Execution_Plan.md` Slice S12, `LLD.md` §1.3 & §2.4, and `PRD.md` §2.5 (Tab Groups).
* **Out of Scope:** Automatic syncing across devices (focus is on 100% local-first storage).

## 2. Architecture & Dependencies
* **Loaded Constraints:** `mv3-patterns`, `preact-ui`, `planner`.
* **New Dependencies:** None (uses existing `chrome.tabs` and `chrome.storage.local`).

## 3. Implementation Phases (TDD Ready)

### Phase 1: Space Manager & Serialization Logic
* **Action:**
  - `[CREATE] src/background/managers/space-manager.ts`: Controller for space logic.
    - `serializeTab(tab: chrome.tabs.Tab)`: Utility to fetch and convert `favIconUrl` to a Base64 string for 100% local-first rendering (LLD §1.3).
    - `createSpace(name, color, captureCurrentTabs)`: Captures serialized tabs.
  - `[MODIFY] src/side-panel/store.ts`: Add `activeSpaceId` signal to track the currently selected workspace.
  - `[MODIFY] src/background/index.ts`: Wire `SPACE_CREATE`, `SPACE_RESTORE`, `SPACE_DELETE`, `SPACE_UPDATE`.
* **Required Tests:**
  - Mock `fetch` to verify image-to-Base64 conversion for favicons.
  - Verify `activeSpaceId` signal updates when a space is restored.

### Phase 2: Spaces UI — List & Navigation
* **Action:**
  - `[CREATE] src/side-panel/components/SpacesView.tsx`: Container view for the Spaces tab.
  - `[CREATE] src/side-panel/components/SpaceCard.tsx`: Visual card for a space showing name, color, and tab count.
* **Required Tests:**
  - Render `SpacesView` with a mocked `SpacesStore` and verify all space cards appear.
  - Verify clicking "Restore" on a card dispatches the `SPACE_RESTORE` message.

### Phase 3: Space Creation Flow & Tab Groups
* **Action:**
  - `[CREATE] src/side-panel/components/SpaceForm.tsx`: Modal with name, color picker, and "Create Native Tab Group" toggle (PRD §2.5).
  - `[MODIFY] src/background/managers/space-manager.ts`: Implement `restoreSpace` with optional `chrome.tabs.group()` logic.
* **Required Tests:**
  - Verify form validation (name required).
  - Mock `chrome.tabs.group` to verify native grouping on restore.

### Phase 4: Polish & Performance
* **Action:**
  - `[MODIFY] src/side-panel/components/SpaceCard.tsx`: Render favicon preview strip using the internal Base64 data (zero network reqs).
  - `[MODIFY] src/side-panel/panel.css`: Add styles for the Spaces Bento Grid and color badges.
* **Required Tests:**
  - Verify zero network requests are made when rendering space card favicons.
  - Verify performance with 30+ tabs (Chrome discarded state test).

## 4. Risks & Mitigations
* ⚠️ **[High Risk]:** Base64 serialization bloating storage -> **Mitigation:** Only store Favicon Data for saved Spaces (not active browsing context) and limit icon height/width to 32px before conversion.
* ⚠️ **[Med Risk]:** Service Worker timeouts during large space capture -> **Mitigation:** Perform capture in foreground if Side Panel is open, or use a serialized async loop in the SW.
