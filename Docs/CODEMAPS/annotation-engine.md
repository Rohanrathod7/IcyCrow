# CODEMAP: Annotation Engine
[LAST UPDATED: 2026-03-28]

## State Management
* `src/workspace/store/annotation-state.ts`
  * `highlights` (signal) -> `Highlight[]`
  * `strokes` (signal) -> `Stroke[]`
  * `stickyNotes` (signal) -> `StickyNote[]`
  * `callouts` (signal) -> `Callout[]`
  * `updateStickyPosition` / `updateCalloutBoxPosition` -> IDB Persistence

## Interaction Logic
* `PdfPage.tsx`
  * `Highlighter` -> Window Selection -> Rect Normalization
  * `InkCanvas` -> Mouse/Touch -> Vector Normalization
  * `StickyNote` -> Click -> Positioned Icon
  * `Callout` -> SVG Arrow + Midpoint Snapping (S29)
  * `WorkspaceRecommendation` -> 🧠 **Registry Check** -> "Recover Annotations" Toast

## Repositioning Engine
* `StickyNote.tsx` / `CalloutBox.tsx`
  * `onPointerDown` (Select tool) -> `setPointerCapture`
  * `onPointerMove` -> `viewerScale` aware delta -> `transform` offset
  * `onPointerUp` -> `updateState` -> `saveAnnotations`

## Export & Sync Engine
* `src/workspace/services/PdfExportService.ts`
  * `Flattening` -> Y-Axis Inversion -> `pdf-lib` drawing loop
* `src/workspace/services/StateSyncService.ts`
  * `exportWorkspace` -> JSON Serialization + Metadata
  * `validateWorkspaceFile` -> 🛡️ **Zod Schema Enforcement**
  * `commitWorkspaceToStore` -> Signal Update -> Atomic IDB Persistence
  * `Auto-Save` -> File System Access API -> Background Handle Sync
