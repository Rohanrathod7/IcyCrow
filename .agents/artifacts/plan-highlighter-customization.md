# 🏗️ Active Plan: Highlighter Customization & Stacking Context

## 1. Requirements & Scope
* **Issues to Resolve:**
  1. **Highlighter Mode Option:** Add an option in the `ToolCustomizer` modal to toggle between "Text Selection" and "Freehand (Page)" highlight mode.
  2. **Highlight Rendering Like Real Ink:** Ensure freehand highlights blend using `multiply` composite operations and translucent alpha to fill like a real highlighter.
  3. **Highlighter Color Ignored:** Resolve the bug where highlighting text always uses yellow instead of the user's customized settings color.
  4. **Dynamic Selection Overlay:** Implement real-time selection preview overlays matching the chosen highlighter color during dragging.
  5. **Auto-Dismiss Customizer:** Close the `ToolCustomizer` modal when clicking anywhere else on the page outside of the modal and toolbar.
* **Blueprint Alignment:** LLD.md section on PDF Page highlighting.
* **Out of Scope:** Canvas brush shape modifications.

## 2. Architecture & Dependencies
* **Loaded Constraints:** `.agents/rules/icycrow-master.md`, `.agents/skills/preact-ui/SKILL.md`
* **New Dependencies:** None

## 3. Implementation Phases (TDD Ready)
### Phase 1: Update Tool Settings Schema & Customizer UI
* **Action:**
  - `[MODIFY] src/workspace/store/viewer-state.ts` - Extend `ToolSettings` to support `mode?: 'text' | 'freehand'` and initialize `highlight` mode to `'text'`.
  - `[MODIFY] src/workspace/components/ToolCustomizer.tsx`:
    - Add click-outside detection using `ref` and `mousedown` event listener to dismiss the modal, ignoring clicks on active tool buttons.
    - If base type is `'highlight'`, render a segmented control to toggle between "Text Selection" and "Freehand (Page)" modes.
* **Required Tests:** Test customizer closing state in Vitest.

### Phase 2: Implement Real-time Highlighter & Custom Colors
* **Action:**
  - `[MODIFY] src/workspace/components/PdfPage.tsx`:
    - In `handlePointerUp`, if mode is `'text'`, fetch `toolSettings.value.highlight?.color` dynamically instead of using hardcoded yellow.
    - Implement a `selectionchange` listener when in `'text'` mode to compute and render a `draftHighlightRects` real-time overlay during dragging.
    - Style the native selection background to be transparent when highlighting to let the custom color shine.
* **Required Tests:** Update `tests/workspace/components/HighlightCapture.test.tsx` to assert on correct custom colors.

### Phase 3: Implement Freehand Highlights & Real Ink Blending
* **Action:**
  - `[MODIFY] src/workspace/components/InkCanvas.tsx`:
    - Activate the drawing canvas if `activeTool` is `'highlight'` and the mode is `'freehand'`.
    - Handle pointer events for `'highlight'` to create freehand translucent strokes with default opacity `0.4` and default color `#fef08a`.
    - In the render loop, set `ctx.globalCompositeOperation = 'multiply'` for strokes with opacity less than `1.0` to achieve realistic ink blending.
* **Required Tests:** Verify existing circular toolbar and ink canvas tests.

## 4. Risks & Mitigations
* ⚠️ **[Medium Risk]:** Double handlers triggering on toolbar clicks and outside click handler at the same time. -> **Mitigation:** The outside click detector will explicitly ignore targets with class `.tool-item` or `.dial-tool-button`.
