# Implementation Plan: Epic S23 - The Spatial Eraser Engine

Implement Layer 5 of the Drawboard: A collision detection system to delete strokes and highlights with persistent storage updates.

## Proposed Changes

### [State] Deletion Logic

#### [MODIFY] [annotation-state.ts](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/store/annotation-state.ts)
-   **Add Actions:**
    -   `deleteStroke(id: string, url: string)`: Filter signal and call `persistAnnotations`.
    -   `deleteHighlight(id: string, url: string)`: Filter signal and call `persistAnnotations`.

### [Component] Vector Collision (Ink)

#### [MODIFY] [InkCanvas.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/InkCanvas.tsx)
-   **Eraser Radius:** Define `ERASER_RADIUS = 10`.
-   **Pointer Logic:**
    -   If `activeTool === 'eraser'`, capture pointer events.
    -   On `pointermove` (while down):
        -   Calculate distance between mouse and every point of every stroke.
        -   Trigger `deleteStroke` if distance < radius.
        -   Performance: Use early exit once a stroke is deleted.

### [Component] DOM Collision (Highlighter)

#### [MODIFY] [HighlightOverlay.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/HighlightOverlay.tsx)
-   **Pointer Events:** Set `pointer-events: auto` ONLY when `activeTool === 'eraser'`.
-   **Click Handler:** Add `onPointerDown` to highlight rects to trigger `deleteHighlight`.

## Verification Plan

### Automated Tests
-   **Unit Tests:** Create `EraserEngine.test.tsx`.
-   **Collision Verification:** Mock strokes and simulate "eraser swipes" at various coordinates.
-   **Persistence Check:** Verify that `persistAnnotations` is called on deletion.

### Manual Verification
-   **Stroke Deletion:** Scribble something, select Eraser, swipe over it. Verify it vanishes.
-   **Highlight Deletion:** Highlight text, select Eraser, click/swipe it. Verify it vanishes.
-   **Persistence:** Delete an item, refresh (F5). Verify it stays gone.
