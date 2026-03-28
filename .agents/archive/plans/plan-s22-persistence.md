# Implementation Plan: Epic S22 - Annotation Persistence Engine

Wire the spatial highlights and freehand strokes to IndexedDB to ensure permanent data storage across browser sessions.

## Proposed Changes

### [Infra] Persistence Layer

#### [MODIFY] [idb-migrations.ts](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/background/managers/idb-migrations.ts)
-   Increment `DB_VERSION` to `5`.
-   Add `document_annotations` object store with `url` as keyPath.

#### [MODIFY] [idb-store.ts](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/background/managers/idb-store.ts)
-   Implement `saveAnnotations(url, data)`.
-   Implement `getAnnotations(url)`.

### [State] State Synchronization

#### [MODIFY] [annotation-state.ts](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/store/annotation-state.ts)
-   Implement `initializeAnnotations(url)`: Fetch from IDB and populate `highlights` and `strokes`.
-   Implement `persistAnnotations(url)`: Save current `highlights.value` and `strokes.value` to IDB.

### [Integration] Lifecycle Hooks

#### [MODIFY] [PdfPage.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/PdfPage.tsx)
-   `useEffect`: Call `initializeAnnotations(url)` on page load.
-   `handlePointerUp`: Call `persistAnnotations(url)` after adding a highlight.

#### [MODIFY] [InkCanvas.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/InkCanvas.tsx)
-   `handlePointerUp`: Call `persistAnnotations(url)` after finishing a stroke.

## Verification Plan

### Automated Tests
-   **IDB Tests:** Mock IndexedDB and verify that `saveAnnotations` and `getAnnotations` interact correctly with the store.
-   **Integration Test:** Verify that `initializeAnnotations` populates the signals from a mocked IDB result.

### Manual Verification
-   **Persistence Test:** Draw a stroke, highlight a word, refresh the page. Verify both remain.
-   **Multi-PDF Test:** Verify that annotations for `fileA.pdf` do not bleed into `fileB.pdf`.
