# Implementation Plan: Workspace State Sync (S28)

Enable users to export and import their interactive annotation state as JSON files for portability and backup.

## User Review Required
> [!IMPORTANT]
> Importing a workspace JSON will **overwrite** current annotations in IndexedDB for the active PDF URL.

## Proposed Changes

### [Service] State Synchronization

#### [NEW] [StateSyncService.ts](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/services/StateSyncService.ts)
- `exportWorkspace()`: Collects all annotation signals, serializes to JSON, and triggers a browser download.
- `importWorkspace(file: File)`: Reads file, parses JSON, validates schema, updates signals, and calls `saveAnnotations`.

### [UI] Toolbar Integration

#### [MODIFY] [ToolbarManager.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/ToolbarManager.tsx) (or similar)
- Add "Save Workspace" and "Load Workspace" buttons.
- Implement a hidden file input for the "Load" action.

## Verification Plan

### Automated Tests
- **Vitest**: `tests/workspace/services/StateSyncService.test.ts`.
  - Verify export payload contains all entities.
  - Verify import updates signals correctly.

### Manual Verification
- Create annotations.
- Click "Save Workspace".
- Delete annotations manually or refresh with cleared state.
- Click "Load Workspace" and select the file.
- Verify all entities reappear and are interactive (e.g., callouts can still be dragged).
