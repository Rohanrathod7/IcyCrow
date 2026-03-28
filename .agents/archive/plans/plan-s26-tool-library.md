# Implementation Plan - Epic S26: Dynamic Tool Library

Enable users to dynamically expand their toolbars with new tool instances from a central "Tool Library".

## User Review Required

> [!IMPORTANT]
> **Tool Uniqueness:** Should users be able to add multiple instances of the same tool type (e.g., two different colored pens)? 
> *Assumption:* Yes, users often want a "Red Pen" and a "Blue Pen" quickly accessible. I will implement a system that generates unique IDs for added tool instances.

## Proposed Changes

### State Management

#### [MODIFY] [toolbar-state.ts](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/store/toolbar-state.ts)
- Add `addToolToToolbar(type: ToolId, settings: any)` action.
- Update `toolsOrder` to include the new instance ID.
- Ensure `toolSettings` and `toolMetadata` are initialized for the new instance.
- Sync `toolsOrder` to `chrome.storage.local`.

### UI Components

#### [NEW] [ToolLibraryPicker.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/ToolLibraryPicker.tsx)
- Create a premium glassmorphic modal displaying a grid of "Available Tools".
- Group tools by category (Writing, Drawing, Erasers, Utilities).
- Add "Add to Toolbar" button for each item.

#### [MODIFY] [EdgeToolbar.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/EdgeToolbar.tsx)
- Connect the `+` button to toggle the `ToolLibraryPicker` visibility.

#### [MODIFY] [CircularToolbar.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/CircularToolbar.tsx)
- Add a `+` button option in the dial's cardinal slots or a dedicated orbit for adding tools.

---

## Verification Plan

### Manual Verification
- Click `+` and verify the Tool Library opens.
- Add a "Blue Pen" and verify it appears in both the Sidebar and the Circular Dial.
- Verify the new tool is fully functional and customizable.
- Refresh the page and verify the custom tool is still in the toolbar.
