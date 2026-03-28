# Implementation Plan: Epic S20-V5 - Specialized Tools & Rotation Fix

This plan streamlines the Dial UI by adding specialized tools (Eraser, Brush, More) and fixing the arc rotation bug.

## Proposed Changes

### [State] Tool Registry Overhaul

#### [MODIFY] [toolbar-state.ts](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/store/toolbar-state.ts)
-   **Add Types:** `eraser`, `brush`, `more`.
-   **Remove Types:** `zoomIn`, `zoomOut`.
-   **Update `toolsOrder`:** Initialize with `['pan', 'select', 'highlight', 'draw', 'brush', 'eraser', 'text', 'more']`.

### [Component] CircularToolbar

#### [MODIFY] [CircularToolbar.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/CircularToolbar.tsx)
-   **Icons:** Map `Eraser`, `Brush`, `MoreHorizontal` from `lucide-preact`.
-   **Arc Rotation Fix:** 
    -   Change indicator to use `border-top-color`.
    -   Ensure rotation starts at `0deg` for the first tool (top-center).
-   **Removal:** Delete `zoomIn`/`zoomOut` logic references.

### [Styles] Indicator Polish

#### [MODIFY] [index.css](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/index.css)
-   Update `.dial-arc-indicator` to use `border-top-color`.

## Verification Plan

### Automated Tests
-   Verify that `toolsOrder` does not contain zoom tools.
-   Verify presence of `eraser` and `brush` tools.
-   Verify arc rotation calculation.

### Manual Verification
-   **Tool Toggle:** Click each tool and ensure the green arc snaps exactly to it.
-   **Zoom Test:** Confirm zoom still works via mouse wheel/keypad (no toolbar icons).
