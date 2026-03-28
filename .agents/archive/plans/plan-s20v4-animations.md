# Implementation Plan: Epic S20-V4 - Animations & Colorful Icon Refinement

This plan refines the Dial UI with dynamic animations and a professional color-coded icon system.

## Proposed Changes

### [Component] CircularToolbar

#### [MODIFY] [CircularToolbar.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/CircularToolbar.tsx)
-   **Dynamic Arc Rotation:**
    -   Calculate the angle of the active tool: `(activeIndex / tools.length) * 360`.
    -   Apply `transform: rotate(N deg)` to the `.dial-arc-indicator`.
-   **Color-Coded Icons:**
    -   Map specific colors to `ToolId`s in the `ICONS` or a new mapping (e.g., Draw = Yellow, Highlight = Green, Select = Blue).
    -   Apply these colors via `className` or `color` prop.

### [Styles] Interactive Polish

#### [MODIFY] [index.css](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/index.css)
-   **Arc Transition:** Add `transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)` for a "bouncy" rotation effect.
-   **Hover States:**
    -   Subtle `box-shadow` glow for active/hovered tools.
    -   Dial hub scale effect on hover.
-   **Icon Gradients:** Replicate the vibrant look by using CSS filters or specific color tokens.

## Verification Plan

### Automated Tests
-   Verify `dial-arc-indicator` has a dynamic rotation style.
-   Verify color classes are applied to tool buttons.

### Manual Verification
-   **Rotation Flow:** Switch tools and ensure the green arc follows smoothly.
-   **Hover Delight:** Hover over tools and ensure scale/glow effects feel premium.
