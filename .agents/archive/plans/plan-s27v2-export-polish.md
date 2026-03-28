# Implementation Plan: PDF Export Engine Polish (S27-V2)

Upgrade the `PdfExportService.ts` to include arrowheads, callout box backgrounds, and sticky note icons for a "What You See Is What You Get" (WYSIWYG) export experience.

## Proposed Changes

### [Service] Visual Enhancements

#### [MODIFY] [PdfExportService.ts](file:///b:/PROGRAMMER_AREA/DEVELOPER/09_Products/IcyCrow/src/workspace/services/PdfExportService.ts)
- **Arrowheads**:
  - Calculate rotation angle based on anchor and box coordinates.
  - Draw a 10px-long triangle at the `anchor` point using `page.drawSvgPath`.
- **Callout Box**:
  - Draw a translucent dark rectangle (`rgb(0.15, 0.15, 0.15)`, `0.85 opacity`) behind the callout text.
  - Hardcode a default width (e.g., 150px) or attempt rough measurement based on text length.
- **Sticky Notes**:
  - Replace raw text with a 24x24 colored square.
  - Use the note's `color` property with a thin black border.

## Verification Plan

### Automated Tests
- **Vitest**: Update `PdfExportService.test.ts` to include a callout and a sticky note, ensuring no runtime errors occur during the more complex rendering.

### Manual Verification
- Annotate a PDF with overlapping callouts and stickies.
- Export and verify:
  - Arrows have pointing heads at the anchor.
  - Callout text is white on a dark translucent background.
  - Sticky notes appear as "blocks".
