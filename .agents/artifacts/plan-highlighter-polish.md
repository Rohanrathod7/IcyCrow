# 🏗️ Active Plan: Highlighter Polish & Cursor Customization

## 1. Requirements & Scope
* **Goal:**
  1. **Correct Transparency/Opacity:** Ensure text highlights respect the custom opacity/transparency value selected by the user in settings (currently it is hardcoded to `0.8`).
  2. **Highlighter Ends Not Curved:** Freehand highlights must have flat, straight chisel-like ends (instead of curved/round ends), resembling a real physical highlighter.
  3. **Highlighter Cursor (MS Edge Style):** When the highlighter tool is selected, change the pointer cursor to a dynamic chisel-tip pen cursor that reflects the active highlighter color.
* **Blueprint Alignment:** LLD.md section on PDF Page highlighting.
* **Out of Scope:** Custom canvas brush textures.

## 2. Architecture & Dependencies
* **Loaded Constraints:** `.agents/rules/icycrow-master.md`, `.agents/skills/preact-ui/SKILL.md`
* **New Dependencies:** None

## 3. Implementation Phases (TDD Ready)
### Phase 1: Support Highlight Opacity & Correct Transparency
* **Action:**
  - `[MODIFY] src/workspace/store/annotation-state.ts` - Add optional `opacity?: number;` to the `Highlight` type interface.
  - `[MODIFY] src/workspace/components/PdfPage.tsx` - Save `opacity: highlightSettings.opacity ?? 0.4` inside the newly created highlight. Also update the real-time draft selection box render style to use this opacity value.
  - `[MODIFY] src/workspace/components/HighlightOverlay.tsx` - Apply `highlight.opacity ?? 0.4` instead of the hardcoded `0.8` opacity to text highlights.
* **Required Tests:** Assert in tests that the newly created highlights contain the correct opacity value from viewer state.

### Phase 2: Square tip ends for Freehand Highlights
* **Action:**
  - `[MODIFY] src/workspace/components/InkCanvas.tsx`:
    - In the render loop, set `ctx.lineCap = isHighlightStroke ? 'square' : 'round'` and `ctx.lineJoin = isHighlightStroke ? 'miter' : 'round'` when drawing freehand highlight strokes.
* **Required Tests:** Verify existing ink canvas and circular toolbar rendering.

### Phase 3: Custom Highlighter Tip Cursor (Edge Style)
* **Action:**
  - `[MODIFY] src/workspace/components/PdfPage.tsx`:
    - Construct a dynamic inline SVG chisel-tip cursor reflecting the active highlighter color (converting `#` to `%23` for data URL safety).
    - Apply this cursor style inline to the `.pdf-page-container` container when `activeTool === 'highlight'`.
* **Required Tests:** Verify that the build succeeds and tests pass.

## 4. Risks & Mitigations
* ⚠️ **[Low Risk]:** SVG inline url syntax parsing failures on older browsers. -> **Mitigation:** Use safe URL encoding for special characters (`#` to `%23`, etc.) to ensure complete browser compatibility.
