import { PDFDocument, rgb } from 'pdf-lib';
import type { IDBAnnotation, SpatialData } from '../types';

/**
 * Bakes spatial annotations into a PDF binary.
 * Compensates for the Y-axis inversion between Canvas (top-down) and PDF (bottom-up).
 */
export async function flattenAnnotations(
  pdfBuffer: ArrayBuffer,
  annotations: IDBAnnotation[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();

  for (const ann of annotations) {
    if (ann.type !== 'spatial') continue;
    const data = ann.data as SpatialData;
    const pageIdx = data.pageNumber - 1;
    if (pageIdx < 0 || pageIdx >= pages.length) continue;

    const page = pages[pageIdx];
    const { width, height } = page.getSize();

    // Convert normalized points to PDF coordinates with Y inversion
    const pdfPoints = data.normalizedPoints.map(p => ({
      x: p.x * width,
      y: height - (p.y * height) // The Y-Axis Trap Fix
    }));

    if (pdfPoints.length < 2) continue;

    const color = parseHexColor(data.color);

    // Draw the path as a series of connected lines (Polyline)
    // pdf-lib's drawLine is standard, but for a path, we iterate
    for (let i = 0; i < pdfPoints.length - 1; i++) {
      page.drawLine({
        start: pdfPoints[i],
        end: pdfPoints[i + 1],
        thickness: data.strokeWidth,
        color: color,
        opacity: 1,
      });
    }
  }

  return await pdfDoc.save();
}

/**
 * Simple hex to rgb parser for pdf-lib.
 */
function parseHexColor(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
}
