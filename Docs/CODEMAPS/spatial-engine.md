[LAST UPDATED: 2026-03-27]

### Spatial Document Engine & Canvas Overlay

* `background/managers/pdf-interceptor.ts` (The Hijack)
  - `setupPdfInterceptor()` -> Injects dynamic `chrome.declarativeNetRequest` rule (ID: 1).
  - Redirects `*.pdf` -> `workspace/index.html?file={url}`.

* `workspace/index.tsx` (Pro Viewer Entry)
  - Composition layer with **Vertical Page Stacking**.
  - Enforces `.pdf-document-wrapper` for perfect centering and 32px gaps.

* `workspace/components/PdfPage.tsx` (Scale-Aware Renderer)
  - Powered by `react-pdf` + `pdfjs-dist@5.4.296`.
  - Connects to `viewerScale` signal for sub-pixel zooming.

* `workspace/components/InkCanvas.tsx` (The Engine)
  - Layers over PDF.js canvas.
  - Pointer Events -> `perfect-freehand` paths -> Signal State.
  - On `pointerUp`: `simplifyPath` -> `normalizePath` -> `saveSpatialAnnotation`.

* `lib/spatial-engine/path-simplifier.ts` (Optimization)
  - `simplifyPath()` -> Ramer-Douglas-Peucker algorithm.
  - Reduces stroke coordinate storage by ~70-80%.

* `lib/spatial-engine/coordinates.ts` (Scaling)
  - `normalizePath()` -> Scales (x, y) to (0-1) ratios for device independence.
  - `denormalizePath()` -> Maps ratios back to current screen resolution.

* `lib/spatial-engine/pdf-flattener.ts` (The Baker)
  - `flattenAnnotations()` -> Uses `pdf-lib` to bake ink into binary.
  - Fixes **The Y-Axis Trap**: `pdfY = pageHeight - (normalizedY * pageHeight)`.
