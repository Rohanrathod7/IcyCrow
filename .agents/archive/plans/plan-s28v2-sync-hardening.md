# Implementation Plan: Workspace Sync Hardening (S28-V2)

Hardening the State Sync system with strict validation, document matching, and a premium preview UI to resolve edge cases and UX friction.

## Proposed Changes

### [Service] Validation & Metadata

#### [MODIFY] [StateSyncService.ts](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/services/StateSyncService.ts)
- **Metadata**: Add `documentUrl`, `title`, and `pageCount` to the export payload.
- **Validation**: Use a Zod schema to validate incoming JSON before processing.
- **Refactor**: Split `importWorkspace` into `validateWorkspaceFile(file)` and `commitWorkspaceToStore(data, url)`.

### [UI] Premium Import Modal

#### [NEW] [WorkspaceImportModal.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/WorkspaceImportModal.tsx)
- **Aesthetic**: Glassmorphic, centrally aligned modal.
- **Features**:
  - Show "Source Document" info vs "Current Document" (warning if mismatched).
  - Summary cards for entity counts (Highlights, Ink, Callouts).
  - "Overwrite Current Workspace" CTA.

#### [MODIFY] [ToolbarSettingsModal.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/ToolbarSettingsModal.tsx)
- Update "Load Workspace" to trigger the validation flow and open the `WorkspaceImportModal`.

## Verification Plan

### Automated Tests
- **Vitest**: Add tests for Zod schema validation (success/fail).
- **Vitest**: Verify document-matching warning logic.

### Manual Verification
- Export workspace from PDF A.
- Try importing it into PDF B -> Verify warning appears in the modal.
- Verify entity counts match the exported data.
- Confirm import and verify IDB persistence.
