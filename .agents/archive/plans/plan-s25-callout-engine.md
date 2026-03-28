# Implementation Plan - Epic S25: Callout Engine

Implementation of a spatial Callout tool that connects an anchor point to an editable text box via an dynamic SVG arrow.

## Proposed Changes

### State Management
#### [MODIFY] [annotation-state.ts](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/store/annotation-state.ts)
- Define `Callout` type.
- Add `callouts` signal.
- Add `draftCallout` volatile signal for drag preview.
- Add `activeCalloutId` signal for text focus.
- Implement `addCallout`, `updateCalloutText`, `deleteCallout` actions.

#### [MODIFY] [idb-store.ts](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/lib/idb-store.ts)
- Update `saveAnnotations` and `getAnnotations` to persist `callouts`.

### Interaction Logic
#### [MODIFY] [PdfPage.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/PdfPage.tsx)
- Implement `onPointerDown`, `onPointerMove`, and `onPointerUp` to handle the callout drag-to-spawn gesture.
- Calculate normalized coordinates via `viewerScale`.

### UI Components
#### [NEW] [CalloutLayer.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/CalloutLayer.tsx)
- Orchestrator for both arrows and text boxes.
- Handles SVG `<marker>` definitions.

#### [NEW] [CalloutArrow.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/CalloutArrow.tsx)
- Renders SVG lines/paths from anchor to box.

#### [NEW] [CalloutBox.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/CalloutBox.tsx)
- Renders the floating text editor/display.
- Implements auto-focus and blur-to-save logic.

### Toolbar Integration
#### [MODIFY] [toolbar-state.ts](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/store/toolbar-state.ts)
- Register `callout` tool in library.

## Verification Plan
### Automated Tests
- `npx vitest run tests/workspace/store/annotation-state.test.ts` (Verify callout state).
- `npx vitest run tests/workspace/components/CalloutBox.test.tsx` (Verify auto-focus/blur).

### Manual Verification
- Select Callout tool, drag from point A to B.
- Verify arrow appears and text box focuses.
- Verify color customization and eraser deletion.
