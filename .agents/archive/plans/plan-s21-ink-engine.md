# Implementation Plan: Epic S21 - The Tactile Pen Engine

Implement Layer 4 of the Drawboard: A high-performance `<canvas>` overlay for freehand ink that persists across zoom levels.

## Proposed Changes

### [State] Annotation Store Extension

#### [MODIFY] [annotation-state.ts](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/store/annotation-state.ts)
-   **Add Types:**
    -   `Point = { x: number, y: number }`
    -   `Stroke = { id: string, pageNumber: number, points: Point[], color: string, width: number }`
-   **Add Signal:** `export const strokes = signal<Stroke[]>([])`.

### [Component] Tactile Drawing Layer

#### [NEW] [InkCanvas.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/InkCanvas.tsx)
-   **Responsibilities:**
    -   Render a High-DPI `<canvas>`.
    -   Redraw strokes on every `strokes` or `viewerScale` change using `requestAnimationFrame`.
    -   Coordinate Normalization: Divide screen coordinates by `viewerScale` before storage.
    -   Pointer Events: Handle `pointerdown`, `pointermove`, `pointerup`.
    -   Permeability: Set `pointer-events: auto` only when active tools are `draw`, `brush`, or `eraser`.

### [Integration] PDF Environment

#### [MODIFY] [PdfPage.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/PdfPage.tsx)
-   Inject `<InkCanvas pageNumber={pageNumber} />` as the top-most layer (z-index: 5).

## Verification Plan

### Automated Tests
-   **Unit Tests:** Create `InkCanvas.test.tsx`.
-   **Math Verification:** Simulate a stroke at 200% zoom, verify stored coordinates are normalized to 100%.
-   **Permeability Check:** Verify `pointer-events` toggles correctly based on `activeTool`.

### Manual Verification
-   **Ink Smoothness:** Verify `lineCap="round"` and `lineJoin="round"` produce quality ink.
-   **Zoom Resilience:** Draw a circle, zoom out, ensure the circle stays locked to the PDF content.
-   **Layer Interaction:** Ensure text selection still works when the "Highlight" tool is selected (mouse passes through canvas).
