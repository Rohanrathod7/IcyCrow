# Implementation Plan - Epic S28: Spatial Sticky Note Engine

Implement a spatially-aware, zoom-synchronized sticky note system with glassmorphic UI and persistent storage.

## User Review Required

> [!IMPORTANT]
> **Spatial Anchoring:** Sticky notes will be anchored to coordinates relative to the original PDF page dimensions. This ensures that as users zoom or resize the browser, the notes stay pinned to the exact text or image they were placed on.

## Proposed Changes

### State Management

#### [MODIFY] [annotation-state.ts](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/store/annotation-state.ts)
- Define `StickyNote` type.
- Create `stickyNotes` signal (array).
- Create `activeStickyId` signal (for UI state).
- Implement `addSticky(page: number, x: number, y: number, color: string)` action.
- Implement `updateStickyText(id: string, text: string)` action.
- Implement `deleteSticky(id: string)` action.
- Update `saveAnnotations` and `initializeAnnotations` to include `stickyNotes`.

### UI Components

#### [NEW] [StickyNote.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/StickyNote.tsx)
- Create a zoom-aware component.
- **Icon Mode:** Small colored message icon.
- **Expanded Mode:** Glassmorphic text area with auto-focus.
- **Eraser Logic:** Delete if hovered while eraser is active.

#### [MODIFY] [PdfPage.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/PdfPage.tsx)
- Add click listener to spawn sticky notes if the `sticky` tool is active.
- Convert screen coordinates to normalized page coordinates.

---

## Verification Plan

### Automated Tests
- `annotation-state.test.ts`: Test `addSticky`, `updateStickyText`, and IDB persistence.
- `StickyNote.test.tsx`: Test rendering modes (collapsed/expanded) and eraser interaction.

### Manual Verification
1. Select "Sticky" tool.
2. Click PDF -> Note should open.
3. Type text and click away -> Note should collapse.
4. Zoom in/out -> Note icon should stay pinned.
5. Select Eraser and hover icon -> Note should be deleted.
6. Refresh -> Note should re-appear.
