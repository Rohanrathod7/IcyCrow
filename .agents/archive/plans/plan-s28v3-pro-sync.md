# Implementation Plan: Pro Workspace Sync (S28-V3)

Level up the Workspace Sync with Auto-Save capabilities and an intelligent "Quick Load" recommendation engine.

## User Review Required
> [!IMPORTANT]
> **Auto-Save** requires the **File System Access API** (supported in Chrome/Edge). Users must explicitly grant permission to a specific folder/file once per session.

## Proposed Changes

### [Service] Persistent Sync & Registry

#### [MODIFY] [StateSyncService.ts](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/services/StateSyncService.ts)
- **File Handle Support**: Implement `showSaveFilePicker` and `showOpenFilePicker` to get persistent handles.
- **Auto-Save Logic**: Implement `autoSaveToHandle(handle, data)` to silently update the file on every annotation change.
- **Registry Engine**: Add `registerWorkspace(url, filename)` to save document associations in `chrome.storage.local`.

### [UI] Productivity Enhancements

#### [NEW] [WorkspaceRecommendation.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/WorkspaceRecommendation.tsx)
- A subtle, premium toast/banner that appears if a document is blank but has a known workspace in the registry.
- One-click "Restore Session" button.

#### [MODIFY] [ToolbarSettingsModal.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/ToolbarSettingsModal.tsx)
- Add "Auto-Save to File" toggle.
- Add "Direct File Sync" status indicator.

## Verification Plan

### Automated Tests
- **Vitest**: Verify `WorkspaceRegistry` updates correctly on export.
- **Vitest**: Mock File System Access API to verify save-to-handle logic.

### Manual Verification
- Enable Auto-Save.
- Draw an ink stroke.
- Open the local `.json` file and verify it updated instantly.
- Clear storage, refresh PDF -> Verify the "Restore Session" recommendation appears.
