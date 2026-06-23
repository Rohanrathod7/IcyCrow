# 🏗️ Active Plan: PDF Scaling and Spacing Fixes

## 1. Requirements & Scope
* **Goal:** Resolve double-scaling layout bugs in the PDF viewer that cause massive blank white spaces when zooming in / fit-to-page, and fix page spacing/margins disappearing when zooming out / single / double / rotated page views.
* **Blueprint Alignment:** LLD Workspace Layout Architecture & Zooming Rules.
* **Out of Scope:** Enhancing annotations or other features outside of the layout scaling and spacing bugs.

## 2. Architecture & Dependencies
* **Loaded Constraints:** `.agents/rules/icycrow-master.md`, `@/.agents/skills/preact-ui/SKILL.md`, `@/.agents/skills/mv3-patterns/SKILL.md`.
* **New Dependencies:** None.

## 3. Implementation Phases (TDD Ready)

### Phase 1: Fix Double Scaling & Layout Shifts in PdfPage component
* **Action:**
  - `[MODIFY] src/workspace/components/PdfPage.tsx`
  - In `onRenderSuccess`, change `dimensions` to use `page.originalWidth` and `page.originalHeight` instead of the pre-scaled `page.width` and `page.height`.
  - Update `finalWidth` and `finalHeight` calculations to use these unscaled dimensions multiplied by `scale`. This prevents double scaling of `.pdf-page-container`.
* **Required Tests:**
  - Verify that `PdfPage` correctly sets container inline style `width` and `height` to `originalDimension * scale`.
  - Run the existing Vitest suite to ensure `PdfPage.test.tsx` passes successfully.

### Phase 2: Spacing & Spacing Collapse Auditing
* **Action:**
  - `[MODIFY] src/workspace/index.css`
  - Audit and ensure `.pdf-page-container` has no styling that clips overflow or breaks flex gap properties in single or double-page views.
  - Verify layout spacing is preserved at low scales (e.g. 30%) and high scales (e.g. 400%).

## 4. Risks & Mitigations
* ⚠️ **Low Risk:** Mismatches between estimated loading page placeholder dimensions and actual rendered page sizes.
  - **Mitigation:** The loading placeholder continues to use estimated dimensions `adjustedDefaultWidth`/`adjustedDefaultHeight` which are updated automatically with scale, ensuring visual continuity.
