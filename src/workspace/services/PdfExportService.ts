import { PDFDocument, rgb, Color } from 'pdf-lib';
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
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
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
  const pages = pdfDoc.getPages();

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    const pageNum = i + 1;

    // 1. Draw Highlights
    const pageHighlights = annotations.highlights.filter(h => h.pageNumber === pageNum);
    for (const highlight of pageHighlights) {
      const color = hexToRgb(highlight.color);
      for (const rect of highlight.rects) {
        // Normalize 0-1000 to PDF points
        const rX = (rect.left / 1000) * width;
        const rY = (rect.top / 1000) * height;
        const rW = (rect.width / 1000) * width;
        const rH = (rect.height / 1000) * height;

        page.drawRectangle({
          x: rX,
          y: height - rY - rH, // Invert Y
          width: rW,
          height: rH,
          color,
          opacity: 0.4
        });
      }
    }

    // 2. Draw Ink Strokes
    const pageStrokes = annotations.strokes.filter(s => s.pageNumber === pageNum);
    for (const stroke of pageStrokes) {
      const color = hexToRgb(stroke.color);
      const strokeWidth = stroke.width || 2;

      for (let j = 0; j < stroke.points.length - 1; j++) {
        const p1 = stroke.points[j];
        const p2 = stroke.points[j + 1];

        page.drawLine({
          start: { 
            x: (p1.x / 1000) * width, 
            y: height - (p1.y / 1000) * height 
          },
          end: { 
            x: (p2.x / 1000) * width, 
            y: height - (p2.y / 1000) * height 
          },
          thickness: strokeWidth,
          color,
          opacity: stroke.opacity || 1
        });
      }
    }

    // 3. Draw Sticky Notes as Icons
    const pageNotes = annotations.stickyNotes.filter(n => n.pageNumber === pageNum);
    for (const note of pageNotes) {
      const color = hexToRgb(note.color);
      const noteSize = 24;
      const nX = (note.x / 1000) * width;
      const nY = (note.y / 1000) * height;
      
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
    const pageCallouts = annotations.callouts.filter(c => c.pageNumber === pageNum);
    for (const callout of pageCallouts) {
      const color = hexToRgb(callout.color);
      
      const aX = (callout.anchor.x / 1000) * width;
      const aY = height - (callout.anchor.y / 1000) * height;
      const bX = (callout.box.x / 1000) * width;
      const bY = height - (callout.box.y / 1000) * height;

      // 4a. The Line
      page.drawLine({
        start: { x: aX, y: aY },
        end: { x: bX, y: bY },
        thickness: 2,
        color
      });

      // 4b. The Arrowhead at Anchor
      const angle = Math.atan2(bY - aY, bX - aX);
      const headLen = 10;
      const angle1 = angle - Math.PI / 6;
      const angle2 = angle + Math.PI / 6;
      const p1 = { x: aX + headLen * Math.cos(angle1), y: aY + headLen * Math.sin(angle1) };
      const p2 = { x: aX + headLen * Math.cos(angle2), y: aY + headLen * Math.sin(angle2) };
      
      const arrowPath = `M ${aX},${aY} L ${p1.x},${p1.y} L ${p2.x},${p2.y} Z`;
      page.drawSvgPath(arrowPath, { color, borderColor: color });

      // 4c. The Text Box
      const boxW = 120;
      const boxH = 35;
      
      page.drawRectangle({
        x: bX - boxW / 2,
        y: bY - boxH / 2,
        width: boxW,
        height: boxH,
        color: rgb(0.12, 0.12, 0.13), // Premium dark gray
        opacity: 0.85
      });

      // 4d. The Text
      if (callout.text) {
        page.drawText(callout.text.substring(0, 30), {
          x: bX - boxW / 2 + 8,
          y: bY - 4,
          size: 10,
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
