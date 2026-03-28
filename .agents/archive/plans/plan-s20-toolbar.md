# Epic S20: Pro Toolbar Engine & Interaction Layer

This epic covers the creation of a sophisticated, interactive toolbar system for the IcyCrow workspace. It supports edge-docking, fluid floating movement, and reorderable tools using `@dnd-kit`.

## Proposed Changes

### [Foundation]
- Install `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.

#### [NEW] [toolbar-state.ts](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/store/toolbar-state.ts)
- Define `ToolbarPosition` and `ToolId` types.
- Export signals for `toolbarPosition`, `floatingCoordinates`, `toolsOrder`, and `toolbarIsDragging`.

### [Components]

#### [NEW] [ToolbarManager.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/ToolbarManager.tsx)
- Orchestrates docking logic and switching between `EdgeToolbar` and `CircularToolbar`.
- **Hysteresis Logic:** 50px proximity to dock, 100px drag away to undock (Sticky Edges).
- **Optimization:** Surgical updates to `floatingCoordinates` via `requestAnimationFrame`.
- **Resize resilience:** Clamp coordinates on `window.resize`.

#### [NEW] [EdgeToolbar.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/EdgeToolbar.tsx)
- Linear reorderable bar for docked states.
- Uses `@dnd-kit/sortable`.
- Glassmorphism design.

#### [NEW] [CircularToolbar.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/CircularToolbar.tsx)
- Floating circular UI for `floating` state.
- Geometric layout.
- Central hub for dragging.
- Reorder mode overlay.

## Verification Plan

### Automated Tests
- `toolbar-state.test.ts`: Unit tests for signal logic.
- `ToolbarManager.test.tsx`: Integration tests for docking zones and state transitions.
- `EdgeToolbar.test.tsx`: UI tests for sortable items.
- `CircularToolbar.test.tsx`: UI tests for geometric layout and reorder overlay.

### Manual Verification
1. Select "draw" tool.
2. Drag floating toolbar to left edge -> ensure it snaps and becomes vertical.
3. Reorder "zoomIn" in edge mode -> ensure smooth swap.
4. Click reorder button in circular mode -> update order via overlay.
