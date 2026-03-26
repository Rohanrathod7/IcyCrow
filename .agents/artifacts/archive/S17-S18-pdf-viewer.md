# Phase 1: The Pristine PDF Viewer

Objective: Achieve perfect PDF rendering with native, pixel-perfect text selection by stripping away all custom annotation layers and focusing on standard-compliant PDF.js integration.

## Proposed Changes

### [Background / Connectivity]

#### [NEW] [rules.json](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/background/rules.json)
- Implement `declarativeNetRequest` rules to intercept all `.pdf` navigate requests.
- Redirect intercepted URLs to `/src/workspace/index.html?url={encodedUrl}`.

#### [MODIFY] [manifest.json](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/manifest.json)
- Declare the `declarative_net_request` ruleset pointing to `rules.json`.
- Ensure all necessary host permissions are active.

### [Workspace UI]

#### [MODIFY] [SpatialPage.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/SpatialPage.tsx)
- **Simplify Rendering:** Remove `InkCanvas` and `HighlightOverlay` imports and usage.
- **Pure Core Rendering:** Focus exclusively on the PDF Canvas (Layer 1) and TextLayer (Layer 3).
- **Official Metrics:** Use standard PDF.js viewport scaling without custom offset "formulas."

#### [NEW] [text-layer.css](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/text-layer.css)
- Implement 100% standard-compliant styles for `.textLayer` and `span`.
- Ensure `color: transparent` and `pointer-events: auto` for spans.
- Remove all `::selection` overrides to restore browser-native blue highlights.

# Phase 2: Fixing PDF Text Layer Misalignment (Ghost Layer Bug)

Objective: Ensure 1:1 pixel-perfect overlap between the rendered PDF canvas and the interactive text selection layer by synchronizing viewport dimensions and scale factors.

## Proposed Changes

### [Workspace Renderer]

#### [MODIFY] [PageRenderer.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/renderer/PageRenderer.tsx)
- Import `pdfjs-dist/web/pdf_viewer.css` for standard text layer resets.
- Dynamically apply `viewport.width` and `viewport.height` to the parent container.
- Apply `--scale-factor: viewport.scale` to the `.textLayer` div as an inline style.

#### [MODIFY] [text-layer.css](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/text-layer.css)
- Enforce absolute positioning and zero-offsets for `.textLayer`.
- Ensure `line-height: 1.0` to match PDF.js character boxes.

# Phase 3: Fixing PDF Text Layer Horizontal Scaling Desync

Objective: Resolve horizontal drift and blurring by implementing Device Pixel Ratio (DPR) awareness for the canvas while maintaining strict CSS dimension parity between the canvas and text layer.

## Proposed Changes

### [Workspace Renderer]

#### [MODIFY] [PageRenderer.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/renderer/PageRenderer.tsx)
- Retrieve `window.devicePixelRatio` for high-DPI rendering.
- Set canvas HTML attributes to `viewport.width * dpr` and `viewport.height * dpr`.
- Ensure canvas and text layer CSS dimensions are strictly `viewport.width` and `viewport.height`.
- Explicitly set `width` and `height` on the `.textLayer` container.

#### [MODIFY] [text-layer.css](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/renderer/text-layer.css)
- Add `transform-origin: 0 0` and `top: 0; left: 0;` to `.textLayer`.
- Ensure `.textLayer span` has `white-space: pre` and `color: transparent`.

# Phase 4: PDF Text Layer Horizontal Drift (CSS Shield & Viewport Parity)

Objective: Prevent global CSS drift (e.g., from Tailwind or other frameworks) from warping text layer kerning and ensure absolute object parity for the viewport across the render pipeline.

## Proposed Changes

### [Workspace Renderer]

#### [MODIFY] [PageRenderer.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/renderer/PageRenderer.tsx)
- Ensure the `viewport` object created via `page.getViewport()` is passed identically to both `page.render()` and `new TextLayer()`.
- Explicitly set `.textLayer` opacity to `0.2` for character-for-character verification.

#### [MODIFY] [text-layer.css](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/renderer/text-layer.css)
- Implement "The Shield": add `!important` resets for `letter-spacing`, `word-spacing`, `line-height`, `padding`, `margin`, and `border` to `.textLayer span`.
- Harden `.textLayer` container rules (top/left/right/bottom/overflow).

# Phase 5: The Mozilla Strict DOM Implementation

Objective: Eliminate all custom layout hackery by adopting the official PDF.js DOM structure (`.page` > `.canvasWrapper` + `.textLayer`). This activates the native CSS rules in `pdf_viewer.css` for perfect character-for-character selection.

## Proposed Changes

### [Workspace Renderer]

#### [MODIFY] [PageRenderer.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/renderer/PageRenderer.tsx)
- Reconstruct DOM: `<div class="page">` wraps `<div class="canvasWrapper">` and `<div class="textLayer">`.
- Apply `--scale-factor` to the `.page` div.
- Explicitly clear `textLayerRef.current.innerHTML` before `textLayer.render()`.

#### [MODIFY] [text-layer.css](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/renderer/text-layer.css)
- [DELETE] All custom `.textLayer` and `.textLayer span` rules.
- Rely solely on `pdfjs-dist/web/pdf_viewer.css`.

# Phase 6: Epic S17-V2: Fix Text Layer Drift (The Rigid Box Protocol)

Objective: Prevent layout squishing and horizontal drift by enforcing strict `min/max` dimensions and `flex-shrink: 0` on the PDF page container. This ensures the coordinate system remains immutable regardless of parent layout changes.

## Proposed Changes

### [Workspace Renderer]

#### [MODIFY] [PageRenderer.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/renderer/PageRenderer.tsx)
- Apply `minWidth`, `maxWidth`, `minHeight`, `maxHeight` to the `.page` container using viewport dimensions.
- Add `flexShrink: 0` to the `.page` container.
- Ensure `canvas` and `.textLayer` are locked to `100%` width/height.
- Re-set `.textLayer` opacity to `0.2` for final verification.

# Phase 8: Epic S17-V3: The react-pdf Architectural Pivot

Objective: Transition to `react-pdf` for a more stable, framework-managed rendering pipeline while maintaining custom annotation layers via the "4-Layer Cake" model.

## Proposed Changes

### [Workspace Components]

#### [MODIFY] [PdfPage.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/PdfPage.tsx)
- Replace manual `pdfjs-dist` logic with `<Document>` and `<Page>`.
- Implement the 4-Layer Cake:
    - **Layer 1 (Canvas):** Managed by `<Page>`.
    - **Layer 2 (Highlights):** `<HighlightOverlay>` positioned absolute.
    - **Layer 3 (Text Layer):** Managed by `<Page>` (`renderTextLayer={true}`).
    - **Layer 4 (Ink):** `<InkCanvas>` positioned absolute.
- Configure local worker: `pdfjs-dist/build/pdf.worker.min.mjs`.

#### [DELETE] [PageRenderer.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/renderer/PageRenderer.tsx)
- This component is now redundant.

### [Workspace UI Styles]

#### [MODIFY] [index.css](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/index.css)
- [DELETE] All custom `.textLayer`, `.page`, and `.canvasWrapper` rules.

## Verification Plan (TDD)

### Automated Tests
1. **RED:** Update `PageRenderer.test.tsx` (renaming to `PdfPage.test.tsx`). Assert that `<Document>` and `<Page>` are rendered.
2. **GREEN:** Implement the `react-pdf` pivot in `PdfPage.tsx`.
3. **REFACTOR:** Finalize overlay positioning.

### Manual Verification
- Re-verify zero horizontal drift with browser selection.
- Confirm highlights and ink layers align perfectly after the pivot.

# Phase 9: Reconnect IndexedDB PDF Pipeline (Epic S17-V3)

Objective: Securely fetch and cache PDF buffers in IndexedDB to ensure offline availability and bypass potential network blocks in the workspace.

## Proposed Changes

### [Library / Storage]

#### [MODIFY] [idb-migrations.ts](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/lib/idb-migrations.ts)
- Increment `DB_VERSION` to `4`.
- Add migration `4`: Create `pdf_cache` object store with `url` as keyPath.

#### [MODIFY] [idb-store.ts](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/lib/idb-store.ts)
- Implement `savePdfToCache(url: string, buffer: ArrayBuffer)` and `getPdfFromCache(url: string)`.

### [Workspace UI]

#### [MODIFY] [index.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/index.tsx)
- Implement `pdfData` state and dual-fetch logic (IDB -> Network -> IDB).
- Render `<Document file={{ data: pdfData }}>`.
- Add loading state for secure database retrieval.

#### [MODIFY] [PdfPage.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/PdfPage.tsx)
- Add debug logs: `console.log("[PDF Pipeline] Data state:", pdfData ? \`Loaded \${pdfData.byteLength} bytes\` : "null");`
- Implement critical guards in the render loop to prevent null-data crashes.
- Add `onLoadError` prop to `<Document>` for internal worker diagnostics.

## Verification Plan

### Manual Verification
- Intercept a PDF, verify it's saved to IndexedDB.
- Refresh workspace, verify it loads from IDB.
- Inspect IndexedDB via DevTools to confirm `pdf_cache` entry exists.

# Phase 10: Fix react-pdf Worker Memory Crash (Blob Implementation)

Objective: Resolve worker memory crashes (captured as `he` errors) for large PDFs by transitioning from raw `Uint8Array` buffer passing to streaming via Blob URLs.

## Proposed Changes

### [Workspace UI]

#### [MODIFY] [index.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/index.tsx)
- Refactor `pdfData` (Uint8Array) to `pdfUrl` (string | null).
- Update `useEffect` to convert `ArrayBuffer` to `Blob` and then `URL.createObjectURL(blob)`.
- Implement `URL.revokeObjectURL(url)` in the `useEffect` cleanup.
- Pass `file={pdfUrl}` to the `<Document>` component.
- Add strict null/empty guards before rendering `<Document>`.

## Verification Plan

### Manual Verification
- Load a large PDF (e.g., 23MB), verify it renders without worker crashes.
- Monitor console for `[PDF Pipeline] Created Blob URL for worker streaming.`
- Confirm `he` error is absent from the console.

# Phase 11: Bypass MV3 CSP with Direct Blob Passing (Epic S17-V3)

Objective: Further harden the architecture against MV3 Content Security Policy (CSP) restrictions by passing `Blob` objects directly to `react-pdf`, eliminating the need for `blob:` URLs.

## Proposed Changes

### [Workspace UI]

#### [MODIFY] [index.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/index.tsx)
- Refactor `pdfUrl` (string) to `pdfBlob` (Blob | null).
- Update `useEffect` to set `Blob` directly into state after verification.
- Remove `URL.createObjectURL` and `URL.revokeObjectURL` logic.
- Add strict buffer corruption checks (`byteLength === 0`).
- Pass `file={pdfBlob}` directly to the `<Document>` component.

## Verification Plan

### Manual Verification
- Load a large PDF, verify it renders without `he` console errors.
- Monitor console for `[PDF Pipeline] Blob created directly. Size: X bytes`.
- Confirm `he` error is absent from the console.

# Phase 12: Diagnostic Data Dump & Worker Bypass (Epic S17-V3)

Objective: Provide a low-level diagnostic path to verify PDF binary integrity and bypass potential MV3 IPC/Worker limitations by disabling the Web Worker and adding a direct Blob download mechanism.

## Proposed Changes

### [Workspace UI]

#### [MODIFY] [index.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/index.tsx)
- **Worker Bypass:** Comment out `pdfjs.GlobalWorkerOptions.workerSrc` to force main-thread rendering.
- **Diagnostic UI:** Inject a visible debug panel above the `<Document>` component.
- **Data Dump:** Implement a `FileReader` based download button to export the raw `pdfBlob` as a file.

## Verification Plan

### Manual Verification
- Confirm the red **DIAGNOSTIC MODE** panel is visible in the workspace.
- Clicking "Download Raw IDB Blob to Disk" should trigger a file download named `icycrow_debug_dump.pdf`.
- Open the downloaded file to verify binary integrity.

# Phase 13: Resolve pdf.js Version Conflict & Cleanup (Epic S17-V3)

Objective: Finalize the architecture by resolving dependency conflicts and purging diagnostic instrumentation.

## Proposed Changes

### [Dependencies]

#### [TERMINAL]
- Uninstall `pdfjs-dist` to allow `react-pdf` to manage the engine version.
- Re-install dependencies to ensure clean linking.

### [Workspace UI]

#### [MODIFY] [index.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/index.tsx)
- **Re-enable Worker:** Restore `pdfjs` import and re-configure the worker using `new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)`.
- **Purge Diagnostics:** Remove the red diagnostic panel and the "Download Raw IDB Blob" button.

#### [MODIFY] [PdfPage.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/PdfPage.tsx)
- Ensure worker configuration is consistent with the global entry point.

## Verification Plan

### Manual Verification
- Verify the PDF renders smoothly with the worker active.
- Verify the diagnostic red panel is gone.

# Phase 15: Pro Viewer Infrastructure & Global State (Epic S18)

Objective: Transition the workspace to a professional Drawboard-style layout with global viewport state and vertical page stacking.

## Proposed Changes

### [Workspace State]

#### [NEW] [viewer-state.ts](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/store/viewer-state.ts)
- Implement `viewerScale` (number) and `activeTool` (pan/select/highlight/draw) signals.

### [Workspace UI]

#### [NEW] [index.css](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/index.css)
- Define `.pdf-workspace-bg` (dark background, overflow control).
- Define `.pdf-artboard` (white paper look, deep shadows, scale transitions).

#### [MODIFY] [index.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/index.tsx)
- Wrap `<Document>` in `.pdf-workspace-bg`.
- Ensure pages stack vertically and are perfectly centered.

# Phase 16: Tooling & Scale Logic (Epic S18)

Objective: Implement interactive controls for zooming and tool selection via a floating professional toolbar.

## Proposed Changes

### [Workspace Components]

#### [NEW] [FloatingToolbar.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/FloatingToolbar.tsx)
- Pill-shaped absolute toolbar (bottom-center).
- Zoom controls (In/Out/Reset) updating `viewerScale`.
- Tool selection buttons updating `activeTool`.

#### [MODIFY] [PdfPage.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/PdfPage.tsx)
- Connect `<Page>` component to `viewerScale`.
- Ensure overlays (Highlight, Ink) scale correctly with the document.

## Verification Plan

### Manual Verification
- Verify PDF pages stack vertically on a professional dark background.
- Test zooming (0.5x to 2.0x) and ensure layout remains centered.
- Verify the toolbar is visible and correctly updates the global state.

# Phase 17: Premium Pro Viewer Layout & CSS Overhaul (Epic S18 Refinement)

Objective: Refine the workspace structure and aesthetics to an enterprise-grade premium standard.

## Proposed Changes

### [Workspace UI]

#### [MODIFY] [index.css](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/index.css)
- Deepen dark mode background to `#171717`.
- Implement `.pdf-document-wrapper` for strict vertical flex alignment and 32px page gapping.
- Add double-shadow and 4px radius to `.pdf-artboard`.
- Apply glassmorphism and refined positioning to `.floating-toolbar`.

#### [MODIFY] [index.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/index.tsx)
- Inject the `.pdf-document-wrapper` div inside the `<Document>` component to enclose the page mapping loop.

#### [MODIFY] [FloatingToolbar.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/FloatingToolbar.tsx)
- Apply the `.floating-toolbar` CSS class to the main container.

## Verification Plan

### Manual Verification
- Verify that horizontal scrolling is absent (unless zoomed).
- Confirm pages are perfectly centered with 32px vertical gaps.
- Verify the premium "paper" look and glassmorphism on the toolbar.

# Phase 14: The Final Dependency Synchronization (Cache Nuke) (Epic S17-V3)

Objective: Eliminate version mismatch and stale cache issues by forcing a specific `pdfjs-dist` version and nuking the Vite pre-bundling cache.

## Proposed Changes

### [Dependencies]

#### [TERMINAL]
- Force install `pdfjs-dist@5.4.296` to match `react-pdf`'s internal engine requirements.
- Nuke Vite cache: `rmdir /s /q node_modules\.vite` (Windows).

### [Workspace UI]

#### [MODIFY] [PdfPage.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/PdfPage.tsx)
- **Explicit Worker URL:** Update worker assignment to use Vite's `?url` import syntax:
  ```tsx
  import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  ```

#### [MODIFY] [index.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/index.tsx)
- Synchronize worker configuration with `PdfPage.tsx` to ensure a single, consistent worker version across the application.

## Verification Plan

### Manual Verification
- Start dev server with `npm run dev -- --force`.
- Verify the `he` error is absent and the PDF renders correctly.
- Confirm Vite correctly bundles the `5.4.296` worker.
