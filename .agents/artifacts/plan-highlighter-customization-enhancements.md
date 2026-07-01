# 🏗️ Active Plan: Highlighter Tooltip & Customization Enhancements

## 1. Requirements & Scope
* **Goal:** Enhance highlighter customization and tooltip colors based on user specifications:
  1. Reduce tooltip highlighter color options from 4 to 3 circles (Yellow, Green, Blue).
  2. Double-clicking any tooltip color circle opens the Customizer panel for that specific highlight preset.
  3. Support customized color values and opacity settings for each of the three highlight presets (`highlight-yellow`, `highlight-green`, `highlight-blue`).
  4. In the Customizer panel, display:
     - The three active highlight presets at the top (under a "Presets" section) for quick switching/selection.
     - A broader color palette grid.
     - An option to select color from screen (via Chrome EyeDropper API).
     - Transparency (opacity) slider defaulting to an optimum highlight value (40%).
  5. In the Customizer Preview Area (left pane):
     - For highlight tools, display actual text (e.g. "This is a highlight preview text") and apply the chosen color and opacity.
     - Add a segmented toggle control for both "Light Screen" and "Dark Screen" backgrounds.
* **Blueprint Alignment:** LLD §3 (Highlighter content script) and LLD §5 (Workspace Customizer interactions).
* **Out of Scope:** Storing global workspace settings in a remote database (remain strictly local-first).

## 2. Architecture & Dependencies
* **Loaded Constraints:** `mv3-patterns.md`, `content-script-css.md`, `preact-ui.md`
* **New Dependencies:** None (uses Chrome native EyeDropper API and existing CSS transitions).

## 3. Implementation Phases (TDD Ready)
### Phase 1: Store & Schema Upgrades
* **Action:**
  - `[MODIFY]` [types.ts](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/lib/types.ts) - Add optional `opacity?: number` to `Highlight` type.
  - `[MODIFY]` [zod-schemas.ts](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/lib/zod-schemas.ts) - Add `opacity: z.number().optional()` to `HighlightCreateSchema` payload.
  - `[MODIFY]` [viewer-state.ts](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/store/viewer-state.ts) - Initialize `highlight-yellow`, `highlight-green`, and `highlight-blue` presets inside `toolSettings` signal.
* **Required Tests:**
  - Update schemas validation unit tests to ensure payloads with `opacity` pass successfully.

### Phase 2: Core Rendering & Restoration Changes
* **Action:**
  - `[MODIFY]` [highlighter.ts](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/content/highlighter.ts) - Accept optional `opacity` argument in `wrapRange` and `wrapCrossElementRange` and use it on the mark style background.
  - `[MODIFY]` [content-script.ts](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/content/content-script.ts) - Pass `h.opacity` to `wrapRange` when restoring highlights from storage.
* **Required Tests:**
  - Test `wrapRange` with custom opacity values and verify the `style.backgroundColor` of the created mark matches.

### Phase 3: Tooltip Interaction Changes
* **Action:**
  - `[MODIFY]` [HighlightTooltip.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/content/components/HighlightTooltip.tsx) - Filter options to `yellow`, `green`, `blue`. Bind double-click events to open the Customizer panel for the target preset. Read custom preset colors dynamically from `toolSettings` instead of hardcoding. Pass customized color and opacity to `HIGHLIGHT_CREATE` payload.
* **Required Tests:**
  - Verify that double clicking a color circle correctly sets `activeCustomizationTool` signal value to `highlight-[color]`.

### Phase 4: Customizer UX Upgrades
* **Action:**
  - `[MODIFY]` [ToolCustomizer.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/ToolCustomizer.tsx):
    - Retrieve base settings from dynamic presets if they match the `highlight-[color]` pattern.
    - Implement a "Light / Dark Preview" toggle in the left preview pane.
    - When `baseType === 'highlight'`, render actual text preview with custom background highlights instead of a circle.
    - Add an "EyeDropper" button to activate `window.EyeDropper` API for screen color selection.
    - Under the color list, display a quick-select "Highlight Presets" row to toggle between editing Yellow, Green, and Blue.
* **Required Tests:**
  - Verify that changing preview background between light/dark works correctly.
  - Test that picking screen color correctly updates the color setting.

## 4. Risks & Mitigations
* ⚠️ **Medium Risk:** Older browser environments or non-Chromium browsers may not support the EyeDropper API -> **Mitigation:** Wrap in a feature detection check `if ('EyeDropper' in window)` and only display the screen color picker button if supported.
* ⚠️ **Low Risk:** Backward compatibility for highlights saved without an `opacity` value -> **Mitigation:** Default to `0.4` if `opacity` is undefined.
