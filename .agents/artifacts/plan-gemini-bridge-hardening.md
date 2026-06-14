# 🏗️ Active Plan: Gemini Bridge Hardening

## 1. Requirements & Scope
* **Goal:** Harden the Gemini Bridge connection to give users more freedom, safety, and reliability in choosing their target Gemini tab:
  1. **Manual Selection Security:** Validate that the manually registered tab's URL strictly starts with `https://gemini.google.com/`. Reject any non-Gemini domains.
  2. **Active Handshake Verification:** Implement a ping-pong handshake between the background service worker and the content script in the target Gemini tab. Automatically try to recover (re-inject the content script) if the handshake fails before marking the tab as disconnected.
  3. **Stale Tab Guard:** Detect when the selected manual bridge tab is closed or navigated away from `gemini.google.com` and automatically reset `manualGeminiTabId` to null, falling back to auto-discovery.
  4. **Premium UI States:** Update the `BridgeSelector` component with distinct color states for health status (Verified Connect, Disconnected, or Unresponsive/Reload-Required) and provide real-time connection feedbacks.
* **Blueprint Alignment:** Manifest V3 API permissions (`scripting`, `tabs`, `storage`), Preact + Signals.
* **Out of Scope:** React framework usage (strictly Preact), external backend servers/sync.

## 2. Architecture & Dependencies
* **Loaded Constraints:**
  - `.agents/rules/icycrow-master.md`
  - `mv3-patterns`
  - `preact-ui`
* **New Dependencies:** None

## 3. Implementation Phases (TDD Ready)

### Phase 1: Security URL Validation in SW & Handshake Message Implementation
* **Action:**
  - `[MODIFY] src/content/content-script.ts`:
    - Add a message listener condition for `{ type: 'PING_BRIDGE' }` that immediately responds with `{ ok: true, pong: true }`.
  - `[MODIFY] src/background/service-worker.ts` / `src/background/gemini-detector.ts`:
    - Implement `verifyBridgeHealth(tabId: number): Promise<boolean>` which sends `PING_BRIDGE` and returns a boolean.
    - Implement `verifyAndRecoverBridge(tabId: number): Promise<boolean>` which checks health, and if false, runs `chrome.scripting.executeScript` to re-inject, waits 300ms, and checks health again.
    - In `MANUAL_REGISTER_BRIDGE` message handler, verify that `tab.url` is present and starts with `https://gemini.google.com/` using `chrome.tabs.get(tabId)`. If invalid, return an error. If valid, perform `verifyAndRecoverBridge(tabId)` before returning success.
* **Required Tests:**
  - In `tests/background/service-worker.test.ts`, test that sending `MANUAL_REGISTER_BRIDGE` with a non-Gemini URL tab returns `ok: false` and error code `INVALID_URL`.
  - Test that a valid URL tab executes the scripting injection and returns `ok: true`.

### Phase 2: Stale Tab Guard & Lifecycle Event Hardening
* **Action:**
  - `[MODIFY] src/background/gemini-detector.ts`:
    - Update the `updateId` function inside `watchGeminiTab` to retrieve `manualGeminiTabId` from session storage. If it is set but is no longer in the list of active Gemini tab IDs, set `manualGeminiTabId: null` in the session storage.
    - Update `chrome.tabs.onUpdated` inside `watchGeminiTab` to listen to any updates where `changeInfo.status` or `changeInfo.url` is set. This guarantees that if a user navigates the manual bridge tab to another URL (e.g. Google Search), the background script immediately detects it and cleans up the registration.
* **Required Tests:**
  - In `tests/background/gemini-detector.test.ts`, write a test that simulates `chrome.tabs.onUpdated` and `chrome.tabs.onRemoved` to verify `manualGeminiTabId` is cleaned up when the tab is navigated away from `gemini.google.com` or closed.

### Phase 3: GEMINI_HEALTH_CHECK Message Upgrade & Bridge Recovery in SW
* **Action:**
  - `[MODIFY] src/background/service-worker.ts`:
    - Refactor `GEMINI_HEALTH_CHECK` to check health of `manualGeminiTabId` (if set and valid) or the first auto-discovered tab.
    - Call `verifyAndRecoverBridge(tabId)` to determine the health status.
    - Return `healthy: boolean`, `tabInfo: { id, title, url } | null`, and `manualGeminiTabId: number | null` in the payload response.
* **Required Tests:**
  - Add a unit test verifying that `GEMINI_HEALTH_CHECK` returns correct health status (`healthy: true` or `false`) based on whether `chrome.tabs.sendMessage` responds to the ping.

### Phase 4: UI Enhancements and Visual Indicators
* **Action:**
  - `[MODIFY] src/side-panel/components/BridgeSelector.tsx`:
    - Use `GEMINI_HEALTH_CHECK` query or active ping to track and display real-time connection status in the side panel.
    - Define states: `CONNECTED` (green, handshake OK), `STALE/UNRESPONSIVE` (orange, tab exists but handshake failed / reload needed), `DISCONNECTED` (red, no tabs).
    - Enhance the dropdown selection list: show individual tab health statuses (e.g., green dot next to healthy tabs, orange next to tabs that need reload).
    - Clean up layout to fit seamlessly in the glassmorphic side-panel design.
* **Required Tests:**
  - UI component smoke tests in `StandaloneTabsView.test.tsx` (or settings test) checking that `BridgeSelector` renders correctly with its status colors.

## 4. Risks & Mitigations
* ⚠️ **[Medium Risk]:** Dynamic content script injection might throw permission errors (e.g., if chrome extension permissions are missing).
  -> **Mitigation:** Wrap scripting execution in clean try/catch blocks, and fall back to notifying the user to refresh the Gemini tab.
* ⚠️ **[Low Risk]:** Frequent health checks causing excessive message passing.
  -> **Mitigation:** Run health checks only on component mount, on manual trigger, or before initiating an AI query.
