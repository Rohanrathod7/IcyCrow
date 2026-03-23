---
# 🏗️ Active Plan: Settings & Export UI (Epic S15)

## 1. Requirements & Success Criteria
* **Goal:** Implement a comprehensive settings panel for theme, AI engine, and cryptographically secure workspace management (Export/Import).
* **Success Criteria:**
  * [x] Settings signal defined in `src/side-panel/store.ts`.
  * [ ] Users can toggle Theme (Light/Dark) and AI Engine (Local/Cloud) with immediate persistence.
  * [ ] Crypto Status (Locked/Unlocked) is visible and manageable (Lock/Unlock button).
  * [ ] Encrypted Backups can be generated and restored (via `.icycrow` files).
  * [ ] Storage Usage Dashboard displays accurate usage per data type (Highlights, Spaces, Chat).
  * [ ] Debug Log Export is available for diagnostic support.

## 2. Architecture & Dependencies
* **Affected Components:**
  * `src/side-panel/components/SettingsView.tsx` [CREATE] - Main settings container.
  * `src/side-panel/components/SettingsPanel.tsx` [MODIFY] - Rename or integrate into SettingsView.
  * `src/side-panel/store.ts` [MODIFY] - Add settings signals if missing.
  * `src/lib/storage.ts` [READ] - Usage calculations.
  * `src/background/index.ts` [READ] - EXPORT/IMPORT handlers check.
* **New Dependencies:** None (Uses native `showSaveFilePicker` and `showOpenFilePicker`).

## 3. Implementation Steps (TDD Ready)

### Phase 1: Settings UI & Signal Binding
1. **[CREATE] `src/side-panel/components/SettingsView.tsx`**:
   * Implement Theme Toggle (Sun/Moon icons).
   * Implement AI Engine Toggle (Window.ai vs Gemini).
   * **Action:** Bind to `settings` signal. Use `setSettings` in `lib/storage.ts` for persistence.
2. **[MODIFY] `src/side-panel/App.tsx`**:
   * Add 'settings' to the view router.
* **Verification (TDD):** Mock `chrome.storage.local` to verify `settings` object updates immediately on UI change.

### Phase 2: Crypto & Security Controls
1. **[MODIFY] `src/side-panel/components/SettingsView.tsx`**:
   * Add **Security Section**.
   * Display `locked` status from session state.
   * Add "Lock Workspace" button (Sends `CRYPTO_LOCK`).
   * Add "Unlock Workspace" button (Sends `CRYPTO_UNLOCK` with password prompt modal).
2. **[ADD] "Nuke" Feature**:
   * Add a danger zone button "Clear All Local Data". Requires password verification + 3-second hold.
* **Verification (TDD):** Verify `CRYPTO_LOCK` message dispatch and UI state reactive update.

### Phase 3: Export/Import Integration
1. **[ADD] Export Flow**:
   * Button: "Generate Encrypted Backup (.icycrow)".
   * Logic: Call `EXPORT_WORKSPACE` -> Background worker -> `showSaveFilePicker` -> Stream to local disk.
2. **[ADD] Import Flow**:
   * Button: "Restore from Backup".
   * Logic: `showOpenFilePicker` -> Read File -> Password Prompt -> Send `IMPORT_WORKSPACE` -> Background processing.
* **Verification (TDD):** Mock `chrome.runtime.sendMessage` and verify `EXPORT_WORKSPACE` payload contains the correct metadata.

### Phase 4: Storage Dashboard & Polish
1. **[ADD] Storage Dashboard**:
   * Component: `StorageUsage.tsx`.
   * Logic: `chrome.storage.local.getBytesInUse()` for total. Calculate individual key sizes for breakdown.
2. **[ADD] Debug Export**:
   * Button: "Download Debug Diagnostics".
   * Logic: Collects system info, SW status, and error logs into a `.json` file.
* **Verification (TDD):** Verify storage calculation logic with mock data sets.

## 4. Testing Strategy
* **Unit:** Settings persistence logic; Crypto UI state transitions.
* **Integration:** Export button -> SW Trigger -> Offscreen Relay.

## 5. Risks & Mitigations
* ⚠️ **Risk:** `showSaveFilePicker` not available in all browser contexts (Side Panel is usually OK) -> **Mitigation:** Fallback to anchor `download` attribute if picker fails.
* ⚠️ **Risk:** Import of large files causing UI freeze -> **Mitigation:** Use background processing (already handled by SW) and show progress spinner in Side Panel.
---
