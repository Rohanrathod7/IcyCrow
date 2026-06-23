# 🏗️ Active Plan: Search Highlighting, Z-Index Layouts, and Export Reliability

## 1. Requirements & Scope
* **Goal**: Resolve search match text highlighting, floating notifications z-index overlay overlapping, top-right utility container side-panel overlapping, and PDF export failure bugs.
* **Scope details**:
  - **Search Match Highlighting**: When the user searches, visually highlight all occurrences of the query inside the text layer of the currently visible pages in the PDF. The currently active match index should be styled with a distinct, active background color.
  - **Z-Index Layering Fixes**:
    - Move the `<SyncToast />` render root out of the `.toolbar-manager-root` (nested z-index context of `10000`) and place it at the top-level parent in `index.tsx` so its global `zIndex: 10050` overlays everything (including the middle bar).
    - Dynamically position the `.top-right-utility-bar` so it shifts left (`right: 340px`) when the right-side panel (`isRightSidebarOpen.value` is true) is visible.
  - **Export PDF Reliability**: Update `PdfExportService.ts` to implement a bulletproof `hexToRgb` converter and fallback checks for highlights/strokes list arrays to prevent crashing the export engine if colors are not formatted as 7-char hex or array properties are undefined.

## 2. Architecture & Dependencies
* **Loaded Constraints**: Preact + Signals, PDF.js Text Layer DOM structure, `pdf-lib`.
* **New Dependencies**: None.

## 3. Implementation Phases (TDD Ready)

### Phase 1: Robust PDF Export Fix
* **Action**:
  - `[MODIFY] src/workspace/services/PdfExportService.ts`
    - Update `hexToRgb` to handle shorthands (3-character hex), remove prefix hashes, and clamp r/g/b values between 0-1.
    - Fallback array fields `highlights`, `strokes`, `stickyNotes`, and `callouts` in `exportAnnotatedPdf` to empty arrays if undefined.

### Phase 2: Z-Index Overlay & Sidebar Repositioning
* **Action**:
  - `[MODIFY] src/workspace/components/ToolbarManager.tsx`
    - Remove `<SyncToast />` markup and its unused import.
  - `[MODIFY] src/workspace/index.tsx`
    - Import and render `<SyncToast />` at the root level of `WorkspaceApp` JSX.
    - Style `.top-right-utility-bar` dynamically to move it left when the right sidebar is open.

### Phase 3: DOM Text Highlight in Search
* **Action**:
  - `[MODIFY] src/workspace/index.tsx`
    - Implement a `useEffect` inside `WorkspaceApp` that listens to `searchQuery.value`, `currentPage.value`, and `searchIndex.value`.
    - Traverse DOM text nodes inside the rendered page's `.textLayer` to wrap occurrences of the search query in `<mark class="search-match">` elements, adding `.search-match-active` to the current match.
  - `[MODIFY] src/workspace/index.css`
    - Add styles for `.search-match` (semi-transparent yellow) and `.search-match-active` (high contrast orange) highlights.

## 4. Risks & Mitigations
* ⚠️ **Low Risk**: Re-rendering pages by react-pdf clears highlights.
  - **Mitigation**: Hook into `onRenderSuccess` or use a MutationObserver / reactive signal update loop to re-highlight text whenever react-pdf re-renders a page.
