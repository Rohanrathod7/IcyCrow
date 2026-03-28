# Implementation Plan - Epic S25: Edge Toolbar Overhaul

Unify the Edge Toolbar (Sidebar) with the Circular Toolbar's premium aesthetic and feature set.

## User Review Required

> [!NOTE]
> **Static Elements:** The `+` and `...` icons at the bottom of the toolbar will be functional triggers for "Add Tool" and "Full Settings" respectively in future epics. For now, they will serve as visual anchors.

## Proposed Changes

### UI Components

#### [MODIFY] [SortableToolItem.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/SortableToolItem.tsx)
- Add **Size Badges**: Render the current `toolSettings.value[id].size` as a small black badge.
- Add **Custom Colors**: Use `toolSettings.value[id].color` for the icon color.
- Synchronize with the circular toolbar's logic (active states, double-click triggers).

#### [MODIFY] [EdgeToolbar.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/EdgeToolbar.tsx)
- Update container styling to match the deep dark rounded look (`background: #1c1c1e`).
- [NEW] Add **Empty Slots**: Render 2-3 dashed-border circles below the active tool list to represent future expandability.
- [NEW] Add **Action Items**: Append `+` (CirclePlus) and `...` (MoreHorizontal) icons at the very bottom.

#### [MODIFY] [index.css](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/index.css)
- Refine `.toolbar-glass` and `.tool-item` classes to ensure perfect alignment and spacing.
- Add animation for the "active" highlight.

---

## Verification Plan

### Manual Verification
- Verify Sidebar matches the reference image's aesthetic.
- Verify size badges update instantly when using the Tool Customizer.
- Verify double-clicking a sidebar tool opens the Customizer correctly.
- Verify dragging/reordering still works within the sidebar.
