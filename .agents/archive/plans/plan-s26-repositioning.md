# Implementation Plan: Annotation Repositioning Engine (S26)

Enable interactive drag-and-drop repositioning for Sticky Notes and Callout boxes using the 'Select' tool.

## Technical Design

### State Management
Modify `src/workspace/store/annotation-state.ts`:
- **`updateStickyPosition(id: string, x: number, y: number)`**: Atomically updates coordinates and triggers IDB save.
- **`updateCalloutBoxPosition(id: string, x: number, y: number)`**: Updates the `box` coordinates of a callout and triggers IDB save.

### Component Logic (Drag Hook)
Implement a standardized pointer-capture pattern in `StickyNote.tsx` and `CalloutBox.tsx`:
1. **Tool Check**: Only active when `activeTool === 'select'`.
2. **Pointer Capture**: Use `setPointerCapture` to maintain drag even if the mouse leaves the box boundary.
3. **Normalized Math**: Calculate final position by adding scaled pixel deltas to original normalized coordinates.
4. **Visual Feedback**: Use `calc()` in `transform` to combine base position with live `dragOffset`.

## Proposed Changes

### [Store] Annotation Actions

#### [MODIFY] [annotation-state.ts](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/store/annotation-state.ts)
- Implement `updateStickyPosition`.
- Implement `updateCalloutBoxPosition`.

### [UI] Repositioning Logic

#### [MODIFY] [StickyNote.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/StickyNote.tsx)
- Implement pointer handlers (`Down`, `Move`, `Up`).
- Apply `transform: translate(...)` combining scale-aware positioning and drag offset.

#### [MODIFY] [CalloutBox.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/CalloutBox.tsx)
- Implement pointer handlers.
- Ensure the arrow (rendering in `CalloutLayer`) remains anchored to the original spot until the box is "dropped".

## Verification Plan

### Automated Tests
- **Vitest**: Extend `annotation-state.test.ts` to verify position atomic updates.
- **Build**: Ensure `npm run build` passes.

### Manual Verification
- Deploy to browser.
- Select 'Select' tool.
- Drag Sticky Note: Verify smooth movement and persistence on reload.
- Drag Callout Box: Verify box moves, and arrow snaps to new spot on release.
- Verify that resizing the window or zooming doesn't break the positioning logic.
