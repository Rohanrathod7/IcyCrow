# 🏗️ Active Plan: Upper-Right Workspace Utilities

## 1. Requirements & Scope
* **Goal**: Implement a top-right utility container containing actions for Search (Find), Full Screen, Print, Save (JSON annotations), Save As (Export annotated PDF), and Settings. Remove the floating Export PDF button from the page canvas.
* **Scope details**:
  - **Top-Right Container**: Glassmorphic container at fixed `top: 20px`, `right: 20px` containing:
    - Search (Ctrl+F)
    - Full Screen (Focus mode)
    - Print (Ctrl+P)
    - Save (Ctrl+S)
    - Save As (Ctrl+Shift+S)
    - Settings (Toggles existing Settings modal)
  - **Search Panel**: Sleek slide-down search bar below the top-center controls to find page matches and navigate next/prev.
  - **Print Layout styling**: Print media queries in `index.css` to hide headers/controls and print the PDF pages cleanly.
  - **Keyboard Shortcuts**: Update `useKeyboardShortcuts.ts` to handle Ctrl+F, Ctrl+P, Ctrl+S, and Ctrl+Shift+S.

## 2. Architecture & Dependencies
* **Loaded Constraints**: Preact + Signals, standard web APIs (fullscreen, print), `lucide-preact`.
* **New Dependencies**: None.

## 3. Implementation Phases (TDD Ready)

### Phase 1: Store & Keyboard Shortcuts Update
* **Action**:
  - `[MODIFY] src/workspace/store/viewer-state.ts`
    - Add signals for search state: `isSearchOpen` (boolean), `searchQuery` (string), `searchResults` (array of numbers), `searchIndex` (number).
  - `[MODIFY] src/workspace/hooks/useKeyboardShortcuts.ts`
    - Intercept Ctrl+S (Save), Ctrl+Shift+S (Save As), Ctrl+P (Print), and Ctrl+F (Search/Find) keys, preventing default action and calling corresponding functions.

### Phase 2: PDF Page Export Removal
* **Action**:
  - `[MODIFY] src/workspace/components/PdfPage.tsx`
    - Remove the FAB floating export button from page render.
    - Remove `handleExport` function and cleanup its imports if unused in `PdfPage.tsx`.

### Phase 3: Utility Container & Search UI implementation
* **Action**:
  - `[MODIFY] src/workspace/index.tsx`
    - Render `.top-right-utility-bar` fixed at `top: 20px`, `right: 20px`.
    - Implement `handleSave` (saving annotations to IDB and file handle), `handleSaveAs` (export annotated PDF), `handlePrint`, `handleSearch`, `toggleFullScreen`, and toggle settings modal.
    - Render a search panel `.search-bar-panel` when search is active.
  - `[MODIFY] src/workspace/index.css`
    - Style `.top-right-utility-bar` and `.search-bar-panel` using Apple dark glassmorphism.
    - Add `@media print` styling to make sure only PDF pages are printed, hiding all controls.

### Phase 4: Validation & Tests
* **Action**:
  - Update `PdfPage.test.tsx` if needed to verify the FAB export button is removed.
  - Run the test suite and verify build compiles cleanly.

## 4. Risks & Mitigations
* ⚠️ **Low Risk**: Printing layout shifts on different browsers.
  - **Mitigation**: Use strict `@media print` rules targeting only `.pdf-document-wrapper` and `.react-pdf__Page` to ensure standard cross-browser print output.
