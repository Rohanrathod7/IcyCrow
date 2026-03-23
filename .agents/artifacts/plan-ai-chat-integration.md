---
# 🏗️ Active Plan: AI Chat Integration (Epic S14)

## 1. Requirements & Success Criteria
* **Goal:** Integrate `window.ai` (Gemini Nano) for zero-latency local chat and implement persistent, Space-aware chat history.
* **Success Criteria:**
  * [ ] `window.ai` detected and used as a "Local Engine" option.
  * [ ] Chat messages persist per Space in `chrome.storage.local`.
  * [ ] Side Panel automatically rotates chat history when switching Spaces.
  * [ ] Offline fallback: If Gemini Nano is unavailable, default to Gemini Bridge.

## 2. Architecture & Dependencies
* **Affected Components:**
  * `src/lib/types.ts` (New message types & Engine enum)
  * `src/lib/zod-schemas.ts` (Contract validation)
  * `src/background/index.ts` (Message routing)
  * `src/background/managers/ai-manager.ts` [CREATE] (Native AI logic)
  * `src/side-panel/store.ts` (Reactive history signals)
  * `src/side-panel/components/ChatView.tsx` (Engine toggle & Hydration)
* **New Dependencies:** None (Uses experimental `window.ai`).

## 3. Implementation Steps (TDD Ready)

### Phase 1: Storage & History Logic
1. **[MODIFY] `src/lib/types.ts`**: Add `ChatEngine = 'gemini' | 'window.ai'`.
2. **[MODIFY] `src/side-panel/store.ts`**:
   * Add `export const chatEngine = signal<ChatEngine>('gemini')`.
   * Add `loadChatHistory(spaceId: UUID)` which calls `getChatHistory(spaceId)` and updates `chatMessages.value`.
3. **[MODIFY] `src/side-panel/App.tsx`**: Call `loadChatHistory` whenever `activeSpaceId` changes.
* **Verification (TDD):** Mock `chrome.storage.local` to verify messages are retrieved correctly for different Space IDs.

### Phase 2: `window.ai` Native Bridge
1. **[CREATE] `src/background/managers/ai-manager.ts`**:
   * Logic to check `window.ai.assistant`.
   * `queryBuiltIn(prompt, streamCallback)`: Proxies to native window.ai.
2. **[MODIFY] `src/background/index.ts`**:
   * Router for `WINDOW_AI_QUERY`.
   * Circuit breaker integration: disable `window.ai` option if not supported by browser.
* **Verification (TDD):** Mock `(window as any).ai` to simulate stream chunks and verify background relay.

### Phase 3: Side Panel UI & Engine Selection
1. **[MODIFY] `src/side-panel/components/ChatView.tsx`**:
   * Add Engine Selector (Toggle or Dropdown).
   * Update `handleSendMessage` to save message to `chrome.storage.local` before dispatching.
2. **[MODIFY] `src/side-panel/components/ChatInput.tsx`**: Add status indicator (e.g., "Ready (Local Nano)").
* **Verification (TDD):** Vitest + JSDOM to verify engine toggle state and message persistence on submit.

### Phase 4: Polish & Resilience
1. **[MODIFY] `src/lib/storage.ts`**: Add `pruneChatHistory(spaceId)` to keep history under 50 messages.
2. **[MODIFY] `src/background/managers/ai-manager.ts`**: Handle model download/available states (`model_not_available`, `readily`).
* **Verification (TDD):** Verify history pruning logic correctly removes oldest messages.

## 4. Testing Strategy
* **Unit:** `storage.ts` history methods; `ai-manager.ts` capability detection.
* **Integration:** `ChatView` -> `AI_QUERY`/`WINDOW_AI_QUERY` -> Background -> Storage Sync.

## 5. Risks & Mitigations
* ⚠️ **Risk:** `window.ai` is only available in Chrome Dev/Canary or with flags -> **Mitigation:** Feature detection in UI; gray out engine option if unavailable.
* ⚠️ **Risk:** Storage Quota Exceeded (Chat history can grow) -> **Mitigation:** Implement LRU pruning (Phase 4).
---
