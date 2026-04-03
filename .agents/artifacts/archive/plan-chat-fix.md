# 🏗️ Active Plan: Fix Chat Messaging & Space Context

## 1. Requirements & Success Criteria
* **Goal:** Resolve the silent failure when sending messages in the chat window by handling the case where no space is active.
* **Success Criteria:**
  * [ ] Chat window displays a "No Space Selected" state if `activeSpaceId` is null.
  * [ ] Chat input is disabled and clearly labeled when no space is active.
  * [ ] User can navigate to the Spaces view from the Chat empty state.

## 2. Architecture & Dependencies
* **Affected Components:**
  * `src/side-panel/components/ChatView.tsx`
  * `src/side-panel/components/ChatInput.tsx`
  * `src/side-panel/App.tsx`
* **New Dependencies:** None

## 3. Implementation Steps (TDD Ready)

### Phase 1: Chat UI Hardening
1. **ChatView Empty State** (`src/side-panel/components/ChatView.tsx`)
   * **Action:** `[MODIFY]` - If `!activeSpaceId.value`, show a call-to-action to select or create a space.
   * **Verification (TDD):** Verify no prompt is sent if `activeSpaceId` is null.
2. **ChatInput Guard** (`src/side-panel/components/ChatInput.tsx`)
   * **Action:** `[MODIFY]` - Add `isActive` prop. If false, disable and change placeholder.
   * **Verification (TDD):** Verify the button is disabled via `disabled` prop.

## 4. Testing Strategy
* **Manual:** Test with no spaces, create space, and check state transitions.
* **Automated:** `npm run build` must pass.

## 5. Risks & Mitigations
* ⚠️ **Risk:** Confusing UX if the user doesn't know what a "Space" is. -> **Mitigation:** Add helpful hints in the empty state.
