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

    // 3. Draw Sticky Notes
    const pageNotes = annotations.stickyNotes.filter(n => n.pageNumber === pageNum);
    for (const note of pageNotes) {
      if (!note.text) continue;
      const color = hexToRgb(note.color);
      
      page.drawText(note.text, {
        x: (note.x / 1000) * width,
        y: height - (note.y / 1000) * height,
        size: 12,
        color
      });
    }

    // 4. Draw Callouts
    const pageCallouts = annotations.callouts.filter(c => c.pageNumber === pageNum);
    for (const callout of pageCallouts) {
      const color = hexToRgb(callout.color);

      // Arrow line
      page.drawLine({
        start: { 
          x: (callout.anchor.x / 1000) * width, 
          y: height - (callout.anchor.y / 1000) * height 
        },
        end: { 
          x: (callout.box.x / 1000) * width, 
          y: height - (callout.box.y / 1000) * height 
        },
        thickness: 2,
        color
      });

      // Text box content
      if (callout.text) {
        page.drawText(callout.text, {
          x: (callout.box.x / 1000) * width + 5,
          y: height - (callout.box.y / 1000) * height,
          size: 10,
          color
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
