# Implementation Plan: Epic S20-V2 - Pro Toolbar UI Overhaul & Performance Fix

This plan overhauls the Pro Toolbar to solve the "Scroll Bug" and transition from a multi-bubble design to a unified, premium glassmorphism dial.

## Proposed Changes

### [Component] ToolbarManager

#### [MODIFY] [ToolbarManager.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/ToolbarManager.tsx)
-   **Coordinate Logic:** Switch from `pageX/pageY` to `clientX/clientY` to ensure dragging is viewport-relative.
-   **Hardware Acceleration:** Apply `floatingCoordinates` using `translate3d(x, y, 0)` on the root container.
-   **Positional Strategy:** Remove `top`/`left` styling for the floating state in favor of the transform.

### [Component] CircularToolbar

#### [MODIFY] [CircularToolbar.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/CircularToolbar.tsx)
-   **Structural Overhaul:** Replace the individual floating `tool-item` bubbles with a `unified-dial-wrapper` container.
-   **Geometry:** Position orbiting `dial-tool-button` elements absolutely within the unified disc.
-   **Dragging:** The `dial-center-hub` will act as the primary drag handle.

### [Styles] Aesthetics

#### [MODIFY] [index.css](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/index.css)
-   **Root Locking:** Add `.toolbar-manager-root` with `position: fixed`.
-   **Unified Look:** Implement `.unified-dial-wrapper`, `.dial-center-hub`, and `.dial-tool-button` with Apple-style glassmorphism (16px blur, 0.85 opacity).

## Verification Plan

### Automated Tests (Vitest)
-   **ToolbarManager.test.tsx:** 
    -   Update tests to verify that `translate3d` is used in the style attribute.
    -   Verify that `pointerMove` uses `clientX/clientY`.
-   **CircularToolbar.test.tsx:**
    -   Verify that `unified-dial-wrapper` is present.
    -   Verify that tools are rendered as `dial-tool-button`.

### Manual Verification
1.  **Scroll Stability:** Open a long PDF, scroll to page 5. Verify the toolbar remains fixed in its screen position.
2.  **Drag Fluidity:** Drag the toolbar across the screen. Verify there is no "jumping" or lag.
3.  **Visual Audit:** Ensure the toolbar looks like a single solid disc with a 16px blur background.
