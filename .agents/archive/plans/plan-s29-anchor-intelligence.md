# Implementation Plan: Callout Anchor Intelligence (S29)

Resolve the issue where Callout arrows only point to the left side of the text box. Implement dynamic side-detection and midpoint snapping.

## Proposed Changes

### [UI] Callout Logic Refinement

#### [MODIFY] [CalloutBox.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/CalloutBox.tsx)
- Calculate the relative vector from `anchor` to `box` (tip).
- Determine the "Closest Side" using the dominant axis of the vector.
- Apply a dynamic `transform` based on the detected side:
  - **Left**: `translate(0, -50%)` (Box start at tip, offset right)
  - **Right**: `translate(-100%, -50%)` (Box end at tip, offset left)
  - **Top**: `translate(-50%, 0)` (Box top at tip, offset down)
  - **Bottom**: `translate(-50%, -100%)` (Box bottom at tip, offset up)
- Add a small 8px-12px gap so the arrow doesn't overlap the box border.

#### [MODIFY] [CalloutLayer.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/CalloutLayer.tsx)
- Ensure the arrow rendering accurately reflects the tip. (No major changes needed if `box` coordinates remain the tip).

## Verification Plan

### Automated Tests
- Run `npm run build` to verify no regressions.

### Manual Verification
- Deploy to browser.
- Create a callout to the **right** of an anchor: Arrow should point to the left side.
- Create a callout to the **left**: Arrow should point to the right side.
- Create a callout **below**: Arrow should point to the top side.
- Create a callout **above**: Arrow should point to the bottom side.
- Drag the box using the 'Select' tool and verify it re-anchors to the optimal side in real-time.
