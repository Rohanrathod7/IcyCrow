# Implementation Plan: PDF Export Rendering Fixes (S27-V3)

Fix rendering bugs where text is missing, boxes are misplaced, and arrowheads are invisible in the exported PDF.

## User Review Required
> [!IMPORTANT]
> This update switches from `drawSvgPath` to `drawLine` for arrowheads to ensure absolute reliability across PDF viewers.

## Proposed Changes

### [Service] Rendering Fixes

#### [MODIFY] [PdfExportService.ts](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/services/PdfExportService.ts)
- **Font Embedding**: Embed `StandardFonts.Helvetica` and pass it to all `drawText` calls.
- **Rectangle Math**: Shift `y` origin for rectangles to account for PDF's "draw upwards" behavior (`y: pdfY - boxHeight`).
- **Text Baseline**: Adjust `y` offset for text to align with the vertical center of the box baseline.
- **Arrowhead Lines**: Replace `drawSvgPath` with two `drawLine` calls representing the "V" shape at the anchor.

## Verification Plan

### Automated Tests
- **Vitest**: `npx vitest run tests/workspace/services/PdfExportService.test.ts`.

### Manual Verification
- Export an annotated PDF.
- Open in Chrome/Adobe.
- Verify:
  - Text is visible and centered in the dark boxes.
  - Boxes are at the correct location (not shifted upwards).
  - Arrowheads are clearly visible at the anchor points.
