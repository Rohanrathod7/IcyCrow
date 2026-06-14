# 🏗️ Active Plan: Smart Focus and Bulk Selection

## 1. Requirements & Scope
* **Goal:**
  1. **Smart Focus and Duplication Prevention for Standalone Tabs:** Track open tabs in the current Chrome window. If a saved standalone tab is already open, show an `[ Open ]` status badge in `StandaloneTabsView` and focus the existing tab on click instead of opening a duplicate.
  2. **Bulk Selection & Move/Delete:** Introduce a multi-select mode in `StandaloneTabsView` with checkboxes. Add a header action bar allowing users to bulk delete selected tabs or bulk move them to a chosen space.
  3. **Edge Case Bug Sweep & Audit:** Review the codebase for Chrome Extension-specific lifecycle and UI issues, and ensure the full test suite passes.
* **Blueprint Alignment:** Strictly uses Chrome Extension MV3 APIs, Preact, and Preact Signals.
* **Out of Scope:** React framework usage (strictly Preact), external backend servers/sync.

## 2. Architecture & Dependencies
* **Loaded Constraints:**
  - `.agents/rules/icycrow-master.md`
  - `mv3-patterns`
  - `preact-ui`
* **New Dependencies:** None

## 3. Implementation Phases (TDD Ready)

### Phase 1: Smart Focus Signal & Track Open Tabs in Current Window
* **Action:**
  - `[MODIFY] src/side-panel/store.ts`:
    - Add a signal `currentWindowOpenTabs = signal<chrome.tabs.Tab[]>([])` to keep track of tabs in the current window.
    - Inside `hydrateStore()`, query tabs in the current window using `chrome.tabs.query({ windowId: currentWin.id })` if `currentWin` is valid.
    - Register listeners on `chrome.tabs` events (`onCreated`, `onUpdated`, `onRemoved`, `onAttached`, `onDetached`) in the side panel context. Guard these listeners so they only update `currentWindowOpenTabs` for tabs that belong to the `currentWindowId`.
* **Required Tests:**
  - In `src/side-panel/store.test.ts`, mock `chrome.tabs.query` to verify that `currentWindowOpenTabs` is populated during store hydration.
  - Verify that tab listeners correctly update `currentWindowOpenTabs`.

### Phase 2: Display "Open" Badge & Smart Focus UI in StandaloneTabsView
* **Action:**
  - `[MODIFY] src/side-panel/components/StandaloneTabsView.tsx`:
    - In `StandaloneTabItem`, match the standalone tab's URL against `currentWindowOpenTabs.value`.
    - If a match is found, show an `[ Open ]` badge in the UI (styled with emerald green glassmorphism).
    - When clicking a standalone tab: if it matches an open tab, focus the existing tab using `chrome.tabs.update(existingTab.id, { active: true })` instead of opening a duplicate with `chrome.tabs.create`.
* **Required Tests:**
  - Verify `StandaloneTabItem` displays the `[ Open ]` badge when the tab is currently open in the active window.
  - Verify that clicking an open tab calls `chrome.tabs.update` to focus the existing tab instead of `chrome.tabs.create`.

### Phase 3: Bulk Selection State and Header controls
* **Action:**
  - `[MODIFY] src/side-panel/store.ts`:
    - Define signals:
      - `bulkSelectionMode = signal<boolean>(false)`
      - `selectedStandaloneTabIds = signal<Record<UUID, boolean>>({})`
    - Add functions:
      - `toggleStandaloneTabSelection(tabId: UUID)`
      - `selectAllStandaloneTabs(tabIds: UUID[])`
      - `clearStandaloneTabSelection()`
      - `bulkDeleteStandaloneTabs()`
      - `bulkMoveStandaloneTabsToSpace(spaceId: UUID)`
  - `[MODIFY] src/side-panel/components/StandaloneTabsView.tsx`:
    - Add an "Edit" or "Select" button to the header of the StandaloneTabsView to toggle `bulkSelectionMode`.
    - When `bulkSelectionMode` is active, display a floating/glassmorphic action toolbar containing:
      - "Select All" / "Clear Selection" buttons.
      - A Space selector dropdown to "Move Selected".
      - A red "Delete Selected" button.
      - A "Cancel" button.
    - In `StandaloneTabItem`, display a checkbox when `bulkSelectionMode` is active. Clicking the checkbox toggles selection.
* **Required Tests:**
  - Test toggling bulk selection mode and selecting multiple standalone tabs.
  - Test that bulk deleting deletes only selected tabs.
  - Test that bulk moving moves selected tabs to a space and removes them from the standalone list.

### Phase 4: Full Audit & Edge Case Sweep
* **Action:**
  - Perform a complete sweep of the codebase for:
    - Non-existent Chrome API calls (like `chrome.windows.getLastFocused` mock failure in background tests).
    - Vitest unit tests suite cleanup to ensure 100% pass rate.
* **Required Tests:**
  - Run all Vitest unit tests to ensure they pass clean.

## 4. Risks & Mitigations
* ⚠️ **[Medium Risk]:** Duplicate tabs may have minor differences in URLs (e.g. query strings or hash URLs).
  -> **Mitigation:** Match URLs directly. If the user expects precise URL matching, that is the standard.
* ⚠️ **[Low Risk]:** Concurrency or delay when performing bulk operations in storage.
  -> **Mitigation:** Use async actions and refresh state only after all SW calls resolve.
