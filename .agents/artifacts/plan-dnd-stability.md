# 🏗️ Active Plan: DND Stability & State Recovery

## 1. Requirements & Scope
* **Goal:** Eliminate the "stuck" drag-and-drop state and "blank screen" crash caused by duplicate tab ID insertion during rapid tab movement between spaces.
* **Blueprint Alignment:** Module M10 (Side Panel UI) and Module M3 (Storage Layer).
* **Out of Scope:** Refactoring the entire dnd-kit implementation or adding new DND features.

## 2. Architecture & Dependencies
* **Loaded Constraints:** `icycrow-master.md`, `mv3-patterns.md`, `preact-ui.md`.
* **New Dependencies:** None.

## 3. Implementation Phases (TDD Ready)

### Phase 1: Store Hardening & Deduplication
* **Action:** `[MODIFY] src/side-panel/store.ts`
  * Update `moveTabBetweenSpaces` to proactively filter out the `tabId` from the destination `toSpace` before performing the `splice`.
  * Update `reorderTabsInSpace` to ensure the tab exists in the space before reordering, preventing orphaned state updates.
* **Required Tests:**
  * `moveTabBetweenSpaces` with a tab that *already exists* in the destination should NOT result in duplicates.
  * `moveTabBetweenSpaces` between different spaces should correctly remove from source and add to destination exactly once.

### Phase 2: Self-Healing Recovery Routine
* **Action:** `[MODIFY] src/side-panel/store.ts`
  * Add a `repairSpaces(store: SpacesStore): SpacesStore` function that creates a deep copy of the store and deduplicates `tabs` arrays in every space based on `id`.
  * `[MODIFY] src/side-panel/components/SpacesView.tsx`: Call `repairSpaces` immediately after fetching spaces from `chrome.storage.local` in the `useEffect` hook.
* **Required Tests:**
  * `repairSpaces` must reduce `[{id: '1'}, {id: '1'}]` to `[{id: '1'}]`.
  * App must load successfully even if storage contains corrupted (duplicate) data.

### Phase 3: UI Controller Stability
* **Action:** `[MODIFY] src/side-panel/components/SpacesView.tsx`
  * Refine `handleDragOver`: Add a guard to check if the `overSpace` actually changed or if the tab's position within the space actually changed before calling store mutators.
  * Use `lastOverId.current` more strictly to debounce "crossing" events.
* **Required Tests:**
  * Rapid "drag-over" events between Space A and Space B boundaries do not trigger a state-flapping loop.

## 4. Risks & Mitigations
* ⚠️ **[Med Risk]:** State-loss during auto-repair if the repair logic is too aggressive. -> **Mitigation:** Only filter by ID, preserving the first occurrence and all other metadata.
* ⚠️ **[Low Risk]:** DND performance degradation due to extra filtering. -> **Mitigation:** Tab lists are small (<100 items), `filter()` and `Set` operations are O(N) and negligible.
