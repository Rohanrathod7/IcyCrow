# 🏗️ Active Plan: Epic S11 — Side Panel Chat UI

## 1. Requirements & Scope
* **Goal:** Technical implementation of the Chat view in the Side Panel, allowing users to query Gemini using selected open tabs as context.
* **Blueprint Alignment:** Aligned with `Execution_Plan.md` Slice S11 and `LLD.md` §2.3.
* **Out of Scope:** Multi-turn chat persistence (for now, focus on single-turn structure as defined in S11), actual Gemini scraping (handled by S7).

## 2. Architecture & Dependencies
* **Loaded Constraints:** `.agents/skills/planner/SKILL.md`, `mv3-patterns`, `preact-ui`.
* **New Dependencies:** 
  - `marked` (Markdown parsing)
  - `dompurify` (HTML sanitization)
  - `highlight.js` (Code syntax highlighting)

## 3. Implementation Phases (TDD Ready)

### Phase 1: Store & Navigation Foundation
* **Action:** 
  - `[MODIFY] src/side-panel/store.ts`: Add `chat` to `ViewType`. Add `chatMessages` and `selectedContextTabs` signals.
  - `[MODIFY] src/side-panel/components/NavBar.tsx`: Add "Chat" button.
  - `[MODIFY] src/side-panel/App.tsx`: Add routing logic for the `chat` view.
* **Required Tests:** 
  - Verify `activeView` signal updates correctly on NavBar click.
  - Verify `App.tsx` renders `ChatView` when `activeView === 'chat'`.

### Phase 2: Chat UI Components
* **Action:**
  - `[CREATE] src/side-panel/components/ChatView.tsx`: Main container for chat.
  - `[CREATE] src/side-panel/components/ChatMessage.tsx`: Component to render individual messages using `marked` + `DOMPurify`.
  - `[CREATE] src/side-panel/components/ChatInput.tsx`: Input area with submit logic.
* **Required Tests:**
  - Render `ChatMessage` with various Markdown strings and verify proper HTML output (sanitized).
  - Verify `ChatInput` triggers a callback with the prompt text.

### Phase 3: Context Selection UI
* **Action:**
  - `[CREATE] src/side-panel/components/ContextPicker.tsx`: Modal or dropdown to select open tabs for context.
  - `[MODIFY] src/side-panel/components/ChatView.tsx`: Integrate `ContextPicker`.
* **Required Tests:**
  - Mock `chrome.tabs.query` to verify the picker shows all open tabs.
  - Verify toggling checkboxes updates the `selectedContextTabs` signal.

### Phase 4: Messaging & Streaming Logic
* **Action:**
  - `[MODIFY] src/side-panel/components/ChatView.tsx`: Implement `AI_QUERY` dispatch and `AI_RESPONSE_STREAM` listener.
  - `[MODIFY] src/side-panel/components/ChatView.tsx`: Handle incremental state updates for the AI response chunk.
* **Required Tests:**
  - Mock `chrome.runtime.sendMessage` and `chrome.runtime.onMessage`.
  - Verify that receiving `AI_RESPONSE_STREAM` messages appends text to the active message in the signal.

## 4. Risks & Mitigations
* ⚠️ **[High Risk]:** CSS Bleed from Markdown rendering -> **Mitigation:** Use `panel.css` scoped classes and ensure `highlight.js` styles are imported locally in the Side Panel.
* ⚠️ **[Med Risk]:** Service Worker termination during long AI queries -> **Mitigation:** Use the existing `AI_QUERY_STATUS` polling fallback if streaming port disconnects (defined in M4).
