# Implementation Plan - Epic S27: Toolbar Customization Hub

Transform the `...` button into a comprehensive Toolbar Configuration portal.

## User Review Required

> [!TIP]
> **Position Switching:** Moving the toolbar from Bottom to Left/Right will automatically switch between the "Circular Dial" and "Edge Sidebar" layout modes, providing a seamless transition between mobile-like and professional-desktop interaction styles.

## Proposed Changes

### State Management

#### [MODIFY] [toolbar-state.ts](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/store/toolbar-state.ts)
- Add `isToolbarSettingsOpen` signal.
- Add `removeToolInstance(id: string)` action to prune dynamic tools.
- Add `resetToolbarLayout()` action to restore factory defaults.
- Ensure all changes sync via `chrome.storage.local`.

### UI Components

#### [NEW] [ToolbarSettingsModal.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/ToolbarSettingsModal.tsx)
- Create a premium glassmorphic modal with:
    - **Position Control:** Icons for Top, Bottom, Left, Right, and Center (Floating).
    - **Active Tools Manager:** A list of current tools with "Remove" (trash) icons for user-added instances.
    - **Global Actions:** "Reset to Defaults".

#### [MODIFY] [EdgeToolbar.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/EdgeToolbar.tsx)
- Connect the `...` button to toggle `isToolbarSettingsOpen`.

#### [MODIFY] [CircularToolbar.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/CircularToolbar.tsx)
- If applicable, connect the center-hub or a dedicated more-icon to the settings modal.

---

## Verification Plan

### Manual Verification
- Click `...` and verify the Settings Modal opens.
- Change position to "Left" and verify the toolbar becomes a Sidebar on the left edge.
- Delete a "Red Pen" instance and verify it disappears from the list.
- Click "Reset Defaults" and verify original tools return.
