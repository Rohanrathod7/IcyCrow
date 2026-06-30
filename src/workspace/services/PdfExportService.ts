import { PDFDocument, rgb, Color, StandardFonts } from 'pdf-lib';
import { Highlight, Stroke, StickyNote, Callout } from '../store/annotation-state';

export interface AnnotationState {
  highlights: Highlight[];
  strokes: Stroke[];
  stickyNotes: StickyNote[];
  callouts: Callout[];
}

/**
 * Helper to convert hex colors to pdf-lib rgb
 */
function hexToRgb(hex: string): Color {
  if (!hex || typeof hex !== 'string') {
    return rgb(1, 1, 0); // Default to yellow if invalid
  }
  
  let cleanHex = hex.trim();
  if (cleanHex.startsWith('#')) {
    cleanHex = cleanHex.slice(1);
  }
  
  if (cleanHex.length === 3) {
    cleanHex = cleanHex[0] + cleanHex[0] + cleanHex[1] + cleanHex[1] + cleanHex[2] + cleanHex[2];
  }
  
  const r = parseInt(cleanHex.slice(0, 2) || 'FF', 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4) || 'FF', 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6) || '00', 16) / 255;
  
  const validR = isNaN(r) ? 1 : Math.max(0, Math.min(1, r));
  const validG = isNaN(g) ? 1 : Math.max(0, Math.min(1, g));
  const validB = isNaN(b) ? 0 : Math.max(0, Math.min(1, b));
  
  return rgb(validR, validG, validB);
}

/**
 * Export a PDF with flattened annotations.
 */
export async function exportAnnotatedPdf(
  originalPdfBlob: Blob,
  annotations: AnnotationState
): Promise<Blob> {
  const pdfBytes = await originalPdfBlob.arrayBuffer();
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  const highlightsList = annotations?.highlights || [];
  const strokesList = annotations?.strokes || [];
  const stickyNotesList = annotations?.stickyNotes || [];
  const calloutsList = annotations?.callouts || [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { height } = page.getSize();
    const pageNum = i + 1;

    // 1. Draw Highlights
    const pageHighlights = highlightsList.filter(h => h.pageNumber === pageNum);
    for (const highlight of pageHighlights) {
      const color = hexToRgb(highlight.color);
      for (const rect of highlight.rects) {
        const rX = rect.left;
        const rY = rect.top;
        const rW = rect.width;
        const rH = rect.height;

        page.drawRectangle({
          x: rX,
          y: height - rY - rH, // Invert Y
          width: rW,
          height: rH,
          color,
          opacity: highlight.opacity ?? 0.4
        });
      }
    }

    // 2. Draw Ink Strokes
    const pageStrokes = strokesList.filter(s => s.pageNumber === pageNum);
    for (const stroke of pageStrokes) {
      const color = hexToRgb(stroke.color);
      const strokeWidth = stroke.width || 2;

      for (let j = 0; j < stroke.points.length - 1; j++) {
        const p1 = stroke.points[j];
        const p2 = stroke.points[j + 1];

        page.drawLine({
          start: { 
            x: p1.x, 
            y: height - p1.y 
          },
          end: { 
            x: p2.x, 
            y: height - p2.y 
          },
          thickness: strokeWidth,
          color,
          opacity: stroke.opacity || 1
        });
      }
    }

    // 3. Draw Sticky Notes as Icons
    const pageNotes = stickyNotesList.filter(n => n.pageNumber === pageNum);
    for (const note of pageNotes) {
      const color = hexToRgb(note.color);
      const noteSize = 24;
      const nX = note.x;
      const nY = note.y;
      
      page.drawRectangle({
        x: nX - noteSize / 2,
        y: height - nY - noteSize / 2, // Center on (x,y)
        width: noteSize,
        height: noteSize,
        color,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1
      });
    }

    // 4. Draw Callouts with Arrowheads and Boxes
    const pageCallouts = calloutsList.filter(c => c.pageNumber === pageNum);
    for (const callout of pageCallouts) {
      const color = hexToRgb(callout.color);
      
      const aX = callout.anchor.x;
      const aY = height - callout.anchor.y;
      const bX = callout.box.x;
      const bY = height - callout.box.y;

      // 4a. The Line
      page.drawLine({
        start: { x: aX, y: aY },
        end: { x: bX, y: bY },
        thickness: 2,
        color
      });

      // 4b. The Arrowhead at Anchor
      const angle = Math.atan2(bY - aY, bX - aX);
      const headLen = 12;
      const angle1 = angle - Math.PI / 6;
      const angle2 = angle + Math.PI / 6;
      const p1 = { x: aX + headLen * Math.cos(angle1), y: aY + headLen * Math.sin(angle1) };
      const p2 = { x: aX + headLen * Math.cos(angle2), y: aY + headLen * Math.sin(angle2) };
      
      // Draw arrowhead as visible lines instead of path
      page.drawLine({ start: { x: aX, y: aY }, end: { x: p1.x, y: p1.y }, thickness: 2, color });
      page.drawLine({ start: { x: aX, y: aY }, end: { x: p2.x, y: p2.y }, thickness: 2, color });

      // 4c. The Text Box (PDF draws UP, so offset Y by height)
      const boxW = 140;
      const boxH = 35;
      
      page.drawRectangle({
        x: bX - boxW / 2,
        y: bY - boxH, // Fixed positioning: Box draws UP from Y
        width: boxW,
        height: boxH,
        color: rgb(0.12, 0.12, 0.12), // Premium dark gray
        opacity: 0.9
      });

      // 4d. The Text (Use embedded font + baseline correction)
      if (callout.text) {
        page.drawText(callout.text.substring(0, 40), {
          x: bX - boxW / 2 + 10,
          y: bY - 22, // Baseline correction
          size: 11,
          font: helveticaFont,
          color: rgb(1, 1, 1) // White text
        });
      }
    }
  }

  const resultBytes = await pdfDoc.save();
  return new Blob([new Uint8Array(resultBytes)], { type: 'application/pdf' });
}

/**
 * Utility to trigger browser download
 */
export function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  // Cleanup
  setTimeout(() => URL.revokeObjectURL(link.href), 100);
}
