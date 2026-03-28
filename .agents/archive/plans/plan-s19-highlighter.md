# Implementation Plan: Epic S19 - The Spatial Highlighter

Implement Layer 2 of the Drawboard: A spatial highlight system that persists across zoom levels and multiplies over PDF text.

## Proposed Changes

### [State] Annotation Store

#### [NEW] [annotation-state.ts](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/store/annotation-state.ts)
-   **Types:**
    -   `HighlightRect = { top: number, left: number, width: number, height: number }`
    -   `Highlight = { id: string, pageNumber: number, rects: HighlightRect[], color: string }`
-   **Signals:** `export const highlights = signal<Highlight[]>([])`.

### [Component] Rendering Layer

#### [NEW] [HighlightOverlay.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/HighlightOverlay.tsx)
-   Props: `pageNumber: number`.
-   Logic: Filter `highlights.value` for the current page.
-   Math: Render `rects` multiplied by `viewerScale.value`.
-   Styles: `mix-blend-mode: multiply`, `position: absolute`.

### [Integration] Capture Engine

#### [MODIFY] [PdfPage.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/PdfPage.tsx)
-   Listener: `onPointerUp` on the page container.
-   Guard: `activeTool.value === 'highlight'`.
-   Normalization: 
    -   `rect.top - container.top`
    -   `normalizedValue = relativeValue / viewerScale.value`.
-   Finalize: Clear selection via `window.getSelection()?.removeAllRanges()`.

## Verification Plan

### Automated Tests
-   **Unit Tests:** Create `HighlightOverlay.test.tsx`. Mock `viewerScale` and verify rect positions.
-   **Integration Tests:** Verify that dragging and releasing produces a normalized highlight in the store.

### Manual Verification
-   **Zoom Test:** Highlight a word, zoom to 200%, ensure highlight still covers the word exactly.
-   **Overlap Test:** Ensure `multiply` blend mode allows text to be readable under the highlight.
