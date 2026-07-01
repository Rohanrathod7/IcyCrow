# 🏗️ Active Plan: Highlighter Slider Glitch and Performance Fix

## 1. Requirements & Scope
* **Goal:** Fix the slider glitch and Chrome hanging bug in the Tool Customizer:
  1. Eliminate the infinite IPC loop caused by high-frequency `chrome.storage.local` writes when dragging size/opacity range sliders.
  2. Stop the slider thumb from jumping backwards/forwards randomly due to stale asynchronous `chrome.storage.onChanged` sync updates.
  3. Optimize `ToolCustomizer.tsx` to avoid generating new `crypto.randomUUID()` strings on every render frame.
* **Blueprint Alignment:** LLD §5 (Workspace Customizer interactions).
* **Out of Scope:** Restructuring the entire storage system or modifying the main UI layout.

## 2. Architecture & Dependencies
* **Loaded Constraints:** `mv3-patterns.md`, `preact-ui.md`
* **New Dependencies:** None

## 3. Implementation Phases (TDD Ready)
### Phase 1: Debounce Storage Synchronization
* **Action:**
  - `[MODIFY]` [viewer-state.ts](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/store/viewer-state.ts)
    - Introduce a module-level or closure-scoped timeout variable `saveTimeout` to debounce writing to `chrome.storage.local`.
    - Apply a 150ms debounce window to the storage set operation inside the `toolSettings` sync effect.
* **Required Tests:**
  - Verify that rapid updates to `toolSettings` only trigger a single write to storage after the debounce interval has elapsed.

### Phase 2: Tool Customizer Cleanups
* **Action:**
  - `[MODIFY]` [ToolCustomizer.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/ToolCustomizer.tsx)
    - Remove the dynamic evaluation of `crypto.randomUUID()` in the footer's render block, replacing it with a stable instance ID or static placeholder to prevent unneeded DOM updates.

## 4. Risks & Mitigations
* ⚠️ **Low Risk:** Debouncing could delay settings syncing across tabs by up to 150ms. -> **Mitigation:** A 150ms delay is imperceptible to users and is standard practice to prevent browser freezes.
