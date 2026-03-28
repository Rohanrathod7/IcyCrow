# Implementation Plan - Epic S24: Tool Customization Engine

Implement a professional-grade customization layer for the Drawboard tools, beginning with Eraser Size Customization.

## User Review Required

> [!IMPORTANT]
> **Trigger Change:** The customization panel will open on **Double-Click** of an active tool icon. A small "chevron" indicator will be added to the tool icons to notify users of customizability.

## Proposed Changes

### State Management (`src/workspace/store/viewer-state.ts`)
- [NEW] Add `toolSettings` signal: `Record<ToolId, { size: number, color?: string, opacity?: number }>`
- Initialize defaults: Eraser (10px), Pen (4px), Brush (8px).

### UI Components

#### [NEW] [ToolCustomizer.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/ToolCustomizer.tsx)
- Create a floating glassmorphic panel.
- Implement a "Thickness" slider with real-time preview (matching the USER's reference image).
- Ensure it remains within viewport bounds using `auto-placement` logic.

#### [MODIFY] [SortableToolItem.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/SortableToolItem.tsx)
- Add `onDoubleClick` handler to trigger the customization panel.
- Add a small `chevron-down` or `dot` indicator for customizable tools.

#### [MODIFY] [FloatingToolbar.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/FloatingToolbar.tsx)
- Integrate the `ToolCustomizer` overlay.

### Engine Integration

#### [MODIFY] [InkCanvas.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/InkCanvas.tsx)
- Replace `ERASER_RADIUS` constant with `toolSettings.value.eraser.size`.
- Ensure real-time update of the visual tracker circle.

---

## Verification Plan

### Automated Tests
- `view-state.test.ts`: Verify settings updates.
- `ToolCustomizer.test.tsx`: Verify slider interaction and state sync.

### Manual Verification
- Double-click eraser icon -> Panel opens.
- Slide thickness -> Visual tracker circle resizes instantly.
- Switch to Sidebar -> Verify icon consistency.
