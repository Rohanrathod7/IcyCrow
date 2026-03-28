# Implementation Plan: Epic S20-V3 - Premium Dial UI Overhaul

This plan overhauls the `CircularToolbar` to exactly match the reference image provided by the user, achieving a high-end, pro-tool aesthetic.

## Proposed Changes

### [Component] CircularToolbar

#### [MODIFY] [CircularToolbar.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/CircularToolbar.tsx)
-   **Outer Dial Details:**
    -   Add 4 directional arrow icons (ChevronUp, etc.) at the cardinal points of the outer ring.
    -   Add "tick marks" (30/60 degree markers) using a generated SVG or CSS background.
-   **Inner Framing:** Use pseudo-elements or specific `div`s to create the white corner brackets ("L" shapes) around the hub.
-   **Enhanced Tool Buttons:**
    -   Introduce a `ToolBadge` component to render the small black numbers (e.g., "10", "20") on icons.
    -   Support colored "glow" or background highlights for active tools (e.g., the Green 'T').
-   **Center Hub:** Refine the hub with a double-layered border and larger active icon.

### [Styles] Premium Aesthetics

#### [MODIFY] [index.css](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/index.css)
-   **Ring Geometry:** Refine `.unified-dial-wrapper` with a darker matte base and subtle radial gradients.
-   **Badges:** Style `.tool-badge` with high-contrast white text on black.
-   **Arc Effect:** Implement a `.dial-arc-indicator` using a conic-gradient or SVG mask.

## Verification Plan

### Automated Tests
-   Verify presence of directional arrows.
-   Verify rendering of tool badges.
-   Verify center hub layering.

### Manual Verification
-   **Visual Comparison:** Toggling tools and observing the "Green 'T'" effect.
-   **Badge Visibility:** Ensuring numbers are crisp and correctly positioned on the icons.
-   **Arc Behavior:** Verifying the vibrant arc correctly highlights the selected segment.
