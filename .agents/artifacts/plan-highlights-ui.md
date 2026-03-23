# 🏗️ Active Plan: Highlights UI (Epic S13)

## 1. Requirements & Scope
* **Goal:** A centralized management interface in the Side Panel for browsing, editing, and navigating all captured highlights across multiple pages.
* **Blueprint Alignment:** `Execution_Plan.md` (S13), `LLD.md` (1.3 Highlights Store).
* **Out of Scope:** Bulk export to 3rd party tools (handled by S15: "Final Polish").

## 2. Architecture & Dependencies
* **Affected Components:**
  * `[CREATE] src/side-panel/components/HighlightsPanel.tsx`
  * `[CREATE] src/side-panel/components/HighlightCard.tsx`
  * `[MODIFY] src/side-panel/store.ts` - Sync logic for cross-page highlights.
  * `[MODIFY] src/side-panel/index.tsx` - Routing entry point.
* **Loaded Constraints:** `mv3-patterns`, `preact-ui`.
* **New Dependencies:** None.

## 3. Implementation Steps (TDD Ready)

### Phase 1: Storage Syndication & Store Update
1. **Highlight Pulse** (`src/side-panel/store.ts`):
   * **Action:** `[MODIFY]` - Implement a reactive `allHighlights` signal. Use `chrome.storage.local.get(null)` on initial load to filter all keys starting with `highlights:`. Listen for `chrome.storage.onChanged` to prune/merge updates in real-time.
   * **Verification (TDD):** Mock `chrome.storage.local` with keys `highlights:hash1`, `highlights:hash2`. Verify that `allHighlights.value` correctly merges both arrays.
   * **Risk:** Low.

### Phase 2: Layout & Grouping Components
1. **HighlightCard** (`src/side-panel/components/HighlightCard.tsx`):
   * **Action:** `[CREATE]` - Render individual highlight snippet, color badge, note preview, and timestamp.
   * **Verification (TDD):** Verify color styling matches the `HighlightColor` type.
2. **HighlightsPanel** (`src/side-panel/components/HighlightsPanel.tsx`):
   * **Action:** `[CREATE]` - Implement grouping logic (by URL/Page Title). Render a vertical list of groups with summary headers.
   * **Verification (TDD):** Pass a mixed list of highlights; verify they group correctly by `url`.
   * **Risk:** Low.

### Phase 3: Cross-Context Navigation & Ghost Logic
1. **Teleport Logic** (`src/side-panel/components/HighlightCard.tsx`):
   * **Action:** `[MODIFY]` - Add "Go to Source" button using `chrome.tabs.create({ url })`.
2. **Ghost Detection**:
   * **Action:** `[MODIFY]` - Add a calculated `isGhost` property to highlights if they belong to the active tab but their `domFingerprint` no longer matches.
   * **Verification (TDD):** Mock active tab with mismatching fingerprint; verify ⚠️ warning appears.
   * **Risk:** Medium (Requires accurate `content-scraper` integration).

### Phase 4: CRUD Operations & Refinement
1. **Note Management**:
   * **Action:** `[MODIFY]` - Implement inline note editing and deletion via `HIGHLIGHT_UPDATE` and `HIGHLIGHT_DELETE` message passing to background.
   * **Verification (TDD):** Spy on `chrome.runtime.sendMessage` to ensure correct message types are dispatched.
   * **Risk:** Low.

## 4. Testing Strategy
* **Unit:** `HighlightCard` rendering, store merging logic.
* **Integration:** Side Panel store → Highlights list → Color update → Background persistence loop.

## 5. Risks & Mitigations
* ⚠️ **Risk:** High volume of highlights causing Side Panel lag. -> **Mitigation:** Use virtualization or simple grouping-limited rendering if count > 50.
---
