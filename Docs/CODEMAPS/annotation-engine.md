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
  * `Callout` -> Phase 1 (Click) -> Phase 2 (Drag) -> SVG Arrow + Midpoint Snapping (S29)

## Repositioning Engine
* `StickyNote.tsx` / `CalloutBox.tsx`
  * `onPointerDown` (Select tool) -> `setPointerCapture`
  * `onPointerMove` -> `viewerScale` aware delta -> `transform` offset
  * `onPointerUp` -> `updateState` -> `saveAnnotations`

## Export Engine
* `src/workspace/services/PdfExportService.ts`
  * `originalPdfBlob` (Signal) -> `PDFDocument.load` (pdf-lib)
  * `Render Loop` -> Y-Axis Inversion -> `drawRectangle` / `drawText` / `drawSvgPath`
  * `Output` -> `SharedArrayBuffer` safe Blob -> `downloadBlob` utility
