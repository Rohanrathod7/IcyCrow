---
# 📝 Documentation Sync Proposal
**Context:** Based on recent Checkpoint Ledger activity (Epic S17 & S18).

## 🤖 AI Context (Codemaps)
* **Target:** `docs/CODEMAPS/spatial-engine.md`
  - Added `react-pdf` rendering pipeline and vertical stacking logic.
  - Documented sub-pixel scaling and viewport normalization.
* **Target:** `docs/CODEMAPS/storage-system.md`
  - Added `pdf_cache` object store in IndexedDB (v4).
* **Target:** `docs/CODEMAPS/highlights-ui.md`
  - Added `FloatingToolbar` and `PdfPage` component architecture.
  - Linked `viewer-state.ts` (Signals) for viewport control.

## 🧑💻 Human Docs (Surgical Edits)
* **Target:** `Docs/architecture/Execution_Plan.md`
  - **Location:** Under heading `## 3. Sequence Planning`
  - **Proposed Change:**
    ```markdown
| **S18** | **Pro Viewer UI & Scale Engine** | ✅ COMPLETED | faacfd6 | 2026-03-27 |
> **Summary:** Implemented enterprise-grade PDF workspace with vertical stacking, premium CSS ("Dark Desk"), glassmorphic floating toolbar, and sub-pixel scaling.
    ```
* **Target:** `Docs/architecture/PRD.md`
  - **Location:** Under heading `### 2.1 What "Done" Looks Like for MVP`
  - **Proposed Change:**
    ```markdown
5. **Spatial PDF Annotation:** Perform tactile, pressure-sensitive markup on PDFs and export annotated binaries (Baked-in). ✅
    ```

---
