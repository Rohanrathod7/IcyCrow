# 🏗️ Active Plan: Spatial Document Engine (Revised)

## 1. Requirements & Success Criteria
* **Goal:** Evolve IcyCrow into a Spatial Document OS by implementing a coordinate-based annotation layer on top of PDFs.
* **Success Criteria:**
  * [ ] Users are redirected to a custom workspace when opening a PDF via **Declarative Net Request**.
  * [ ] High-performance **Canvas-based** digital ink anchors to PDF coordinates.
  * [ ] **pdf.js** is bundled to provide a controlled, scriptable document environment.
  * [ ] **Douglas-Peucker** path simplification reduces storage bloat by ~70%.
  * [ ] Multimedia callouts (audio, images) can be pinned to specific X/Y positions.
  * [ ] 100% Local-First: No external processing or cloud storage.

## 2. Architecture & Dependencies
* **Affected Components:**
  * `[MODIFY] manifest.json` - Add `declarative_net_request` permissions and ruleset.
  * `[CREATE] src/rules/pdf-rules.json` - JSON ruleset for PDF interception.
  * `[CREATE] src/workspace/` - The native document environment (Preact + pdf.js).
  * `[CREATE] src/lib/spatial-engine/path-simplifier.ts` - Douglas-Peucker algorithm.
  * `[MODIFY] src/lib/idb-migrations.ts` - Schema update for `annotations` store.
  * `[CREATE] src/workers/flatten-worker.ts` - Offscreen binary PDF modification.
* **New Dependencies:**
  * `pdfjs-dist` (PDF rendering engine)
  * `pdf-lib` (Binary PDF modification for flattening)
  * `perfect-freehand` (For premium tactile ink feel)

## 3. Implementation Phases (TDD Ready)

### Phase 1: Native Workspace & MV3 Interception
1. **MV3 PDF Interception (DNR)** (`src/rules/pdf-rules.json`)
   * **Action:** `[CREATE]` - Define a `declarativeNetRequest` ruleset to redirect `.pdf` URLs to `chrome-extension://<id>/workspace/index.html?file={url}`.
   * **Verification (TDD):** Verify redirection rules are correctly registered via `chrome.declarativeNetRequest.getDynamicRules()`.
2. **Unified PDF Environment** (`src/workspace/components/PdfViewer.tsx`)
   * **Action:** `[CREATE]` - Bundle `pdf.js` and render document to a base canvas. Provides sync hooks for zoom/scroll state.
   * **Verification:** Verify PDF renders correctly in the workspace and emits scroll/zoom events.

### Phase 2: Tactile Ink & High-Performance Overlay
1. **Glass Ink Overlay** (`src/workspace/components/InkCanvas.tsx`)
   * **Action:** `[CREATE]` - A pure `<canvas>` overlay for ink. Uses `ctx.fill()` with `perfect-freehand` stroke data for high performance.
   * **Verification:** Mock pointer events and verify canvas drawing matches expected stroke geometry.
2. **Path Simplification** (`src/lib/spatial-engine/path-simplifier.ts`)
   * **Action:** `[CREATE]` - Implement Douglas-Peucker algorithm to strip redundant points from freehand paths.
   * **Verification (TDD):** Unit tests comparing raw vs. simplified path sizes and visual fidelity.

### Phase 3: Multimedia Callouts & Spatial Storage
1. **Spatial Anchoring** (`src/lib/spatial-engine/coordinates.ts`)
   * **Action:** `[CREATE]` - Logic to map viewport (px) to PDF page-relative (0..1) units, normalized for zoom.
   * **Verification (TDD):** Verify coordinate stability during simulated zoom and scroll.
2. **Storage Serialization** ([src/lib/storage.ts](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/lib/storage.ts))
   * **Action:** `[MODIFY]` - Update `saveAnnotation` to handle simplified paths and Blob media (audio/images).
   * **Verification (TDD):** Verify data round-trip and storage efficiency in `IcyCrowDB`.

### Phase 4: Flattening & Export Pipeline
1. **Flattening Worker** (`src/workers/flatten-worker.ts`)
   * **Action:** `[CREATE]` - Uses `pdf-lib` to redraw saved annotations (simplified paths/shapes) into the PDF binary.
   * **Verification (TDD):** Verify the worker output contains valid PDF modification objects.
2. **Universal Export** (`src/workspace/components/ExportToolbar.tsx`)
   * **Action:** `[CREATE]` - "Flatten & Download" flow using `showSaveFilePicker`.
   * **Verification:** Manual audit of the exported PDF in external viewers.

## 4. Testing Strategy
* **Unit:** Douglas-Peucker logic, Coordinate normalization, PDF binary injection.
* **Integration:** DNR redirection, Canvas-to-IDB sync, Multi-page annotation persistence.
* **Manual:** Ink "tactile" performance audit, Export compatibility.

## 5. Risks & Mitigations
* ⚠️ **[Med Risk]: PDF.js Versioning** -> **Mitigation:** Pin `pdfjs-dist` to a stable version to avoid breakages in worker-to-UI communication.
* ⚠️ **[Med Risk]: Memory Pressure** -> **Mitigation:** Implement viewport-aware rendering for the ink canvas to only paint visible strokes.
