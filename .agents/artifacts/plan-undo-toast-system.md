# 🏗️ Active Plan: Annotation Undo Toast System

## 1. Requirements & Scope
* **Goal:** Implement an "Undo" toast system to allow users to restore accidentally deleted highlights, drawings (strokes), sticky notes, and callouts.
  1. In the PDF Workspace: Add support for an custom `onAction` callback in the `SyncToast` component. On deletion of any workspace annotation (highlight, stroke, sticky, callout), display a toast with an "Undo" action button to restore the deleted element.
  2. In the Host Webpage (Content Script): Maintain the last deleted highlight in memory. On deletion, display a custom interactive toast with an "Undo" button.
  3. Live Rendering: Update the content script storage listener to dynamically locate and wrap newly added highlights (such as when restored via Undo).
* **Blueprint Alignment:** LLD §3 (Highlighter content script) and LLD §5 (Workspace Customizer & Sidebar interactions).
* **Out of Scope:** Multi-step action history (only single-step "last deleted" undo).

## 2. Architecture & Dependencies
* **Loaded Constraints:** `mv3-patterns.md`, `preact-ui.md`
* **New Dependencies:** None

## 3. Implementation Phases (TDD Ready)
### Phase 1: Workspace Toast Enhancement
* **Action:**
  - `[MODIFY]` [SyncToast.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/SyncToast.tsx)
    - Extend `syncToastMessage` signal to support `actionLabel` and `onAction`.
    - Render a custom action button in `SyncToast` when these properties are provided.
    - Update `showSyncToast` signature to accept `actionLabel` and `onAction`.

### Phase 2: Workspace Undo Actions
* **Action:**
  - `[MODIFY]` [annotation-state.ts](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/store/annotation-state.ts)
    - Define a `lastDeletedItem` signal to hold the recently deleted annotation and its source URL.
    - Update `deleteHighlight`, `deleteStroke`, `deleteSticky`, and `deleteCallout` to populate `lastDeletedItem`, and invoke `showSyncToast` with an "Undo" action.
    - Implement a recovery handler that pushes the deleted item back into its respective array and persists changes.

### Phase 3: Webpage (Content Script) Undo Actions
* **Action:**
  - `[MODIFY]` [web-annotation-state.ts](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/content/store/web-annotation-state.ts)
    - Implement `showWebToast` and `showWebUndoToast` DOM helpers.
    - Track the last deleted webpage highlight in a module-level variable `lastDeletedHighlight`.
    - Update `deleteWebHighlight` to capture the deleted highlight, show the undo toast, and re-create the highlight if undone.
  - `[MODIFY]` [content-script.ts](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/content/content-script.ts)
    - In `handleStorageChange`, detect when a highlight is *added* (such as on undo) and dynamically locate and wrap the range in `<mark>` nodes.

## 4. Risks & Mitigations
* ⚠️ **Low Risk:** Storage state sync timing race conditions during undo. -> **Mitigation:** The undo actions use the same message handlers (`HIGHLIGHT_CREATE`, `HIGHLIGHT_DELETE`) and unified persistence functions as regular operations to guarantee sequential integrity.
