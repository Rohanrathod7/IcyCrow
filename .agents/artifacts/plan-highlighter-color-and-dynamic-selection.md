# 🏗️ Active Plan: Highlighter Color & Dynamic Selection

## 1. Requirements & Scope
* **Goal:** 
  1. Highlight using the custom color selected by the user in `toolSettings` instead of the hardcoded yellow color.
  2. Implement real-time dynamic selection overlay so that as the user selects text (pointer dragging), a draft highlight matching the selected color overlays the selection instantly.
  3. Style selection to be clean and transparent when the highlighter tool is active, letting the custom highlighter color shine through.
* **Blueprint Alignment:** LLD.md section on PDF Page highlighting.
* **Out of Scope:** Structural improvements to the text parsing or PDF export logic.

## 2. Architecture & Dependencies
* **Loaded Constraints:** `.agents/rules/icycrow-master.md`, `.agents/skills/preact-ui/SKILL.md`
* **New Dependencies:** None

## 3. Implementation Phases (TDD Ready)
### Phase 1: Real-time Selection Capture & Dynamic Highlight Color
* **Action:**
  - `[MODIFY] src/workspace/components/PdfPage.tsx`:
    - Track a `draftHighlightRects` state.
    - Set up a `selectionchange` event listener when `activeTool === 'highlight'` to dynamically compute normalized selection rects relative to the page container.
    - Render the real-time draft selection divs with `mixBlendMode: 'multiply'` and `opacity: 0.6` colored using the custom setting color (`toolSettings.value.highlight?.color`).
    - Update `handlePointerUp` to read the dynamic settings color `toolSettings.value.highlight?.color` when saving the new highlight.
* **Required Tests:** Write failing tests in `tests/workspace/components/HighlightCapture.test.tsx` verifying:
  - Highlights are created with the custom setting color instead of default yellow.
  - Draft selection rects are generated on `selectionchange` events.

### Phase 2: Selection Style override
* **Action:**
  - `[MODIFY] src/workspace/index.css`:
    - Add `.pdf-page-container.highlight-tool-active *::selection` selector to style selection backgrounds to be transparent when the highlight tool is active.
* **Required Tests:** Verify existing tests and build output.

## 4. Risks & Mitigations
* ⚠️ **[Low Risk]:** Rapid mouse movement causing lag in `selectionchange` calculations. -> **Mitigation:** Browser native selection change event is highly optimized; parsing client rects from a simple text range is a fast O(1) operation.
