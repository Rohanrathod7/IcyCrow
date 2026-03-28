# Implementation Plan: PDF Export Engine (S27)

Build a high-fidelity PDF export service that flattens digital annotations into a permanent PDF document.

## Technical Design

### Core Library: `pdf-lib`
We will use `pdf-lib` for low-level PDF manipulation. It allows us to draw shapes, text, and SVG paths directly onto existing PDF pages.

### Rendering Engine (`PdfExportService.ts`)
The service will handle the following transformations:
1. **Coordinate Mapping**: UI coordinates (normalized `0-1000` or absolute pixels) must be converted to PDF points (usually `72 DPI`).
2. **Y-Axis Inversion**: PDFs use a bottom-left origin `(0,0)`, while the browser uses top-left.
   - Formula: `pdfY = pageHeight - normalizedY`
3. **Layer Flattening**:
   - **Highlights**: `page.drawRectangle()` with transparency.
   - **Ink Strokes**: `page.drawLine()` loops for maximum compatibility (compared to `drawSvgPath`).
   - **Sticky Notes**: Rendered as `page.drawText()` blocks.
   - **Callouts**: `page.drawLine()` for arrow + `page.drawText()` for the message.

## Proposed Changes

### [Service] Export Logic

#### [NEW] [PdfExportService.ts](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/services/PdfExportService.ts)
- Async function `exportAnnotatedPdf`.
- Page-by-page rendering loop.
- Browser-native download trigger.

### [UI] Export Integration

#### [MODIFY] [PdfPage.tsx](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/components/PdfPage.tsx) (or a Header component)
- Add a Floating Action Button (FAB) or a top-bar "Download" icon.
- Handle "Processing..." loading state during serialization.

## Verification Plan

### Automated Tests
- **Vitest**: Create `PdfExportService.test.ts`.
- Use a mock `PDFDocument` or verify the function correctly calls `drawRectangle`, `drawText`, etc., with the expected inverted coordinates.

### Manual Verification
- Annotate a multi-page PDF with all 4 tools.
- Export and download.
- Verify in:
  - Chrome PDF Viewer (General)
  - Adobe Acrobat (Standard)
  - Preview.app (iOS/macOS)
- Check that colors and opacities match the UI.
