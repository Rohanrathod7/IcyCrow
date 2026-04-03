# 🏗️ Active Plan: Drag & Drop Stability (Regeneration)

## 1. Requirements & Success Criteria
* **Goal:** Resolve the "stuck" glitch when dragging a tab across spaces and back to origin.
* **Success Criteria:**
  * [ ] Rapid "seesaw" dragging between two spaces does not freeze the UI.
  * [ ] Dragging back to original space is smooth.
  * [ ] No infinite signal update loops.

## 2. Architecture & Dependencies
* **Affected Components:**
  * `src/side-panel/components/SpacesView.tsx`
  * `src/side-panel/store.ts`
* **New Dependencies:** None

## 3. Implementation Steps (TDD Ready)

### Phase 1: Store Hardening
1. **Idempotency Guards** (`src/side-panel/store.ts`)
   * **Action:** `[MODIFY]` - If the tab is already in the target container at the target index, return early without signal update.
   * **Verification (TDD):** Mock signal subscriptions and verify no update for identical moves.

### Phase 2: Controller Stabilization
1. **Live Container Tracking** (`src/side-panel/components/SpacesView.tsx`)
   * **Action:** `[MODIFY]` - In `handleDragOver`, always use `findContainer(activeId)` instead of stale `active.data.current.containerId`.
   * **Verification (TDD):** Trace container lookups during midpoint moves.

## 4. Testing Strategy
* **Manual:** Rapid "seesaw" drag test 10x.
* **Automated:** Build and existing test suite.

## 5. Risks & Mitigations
* ⚠️ **Risk:** `findContainer` O(N) lookup. -> **Mitigation:** O(N) is safe for < 100 tabs; if it becomes a bottleneck, we will cache container maps in a signal.
