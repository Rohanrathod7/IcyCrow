import { describe, it, expect, vi } from 'vitest';
import { exportAnnotatedPdf } from '../../../src/workspace/services/PdfExportService';

describe('PdfExportService', () => {
  it('should return a valid PDF blob', async () => {
    // Generate a minimal valid PDF-like buffer for pdf-lib to load or use a real one
    // pdf-lib's PDFDocument.create() is safer for empty tests
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.create();
    doc.addPage([600, 800]);
    const pdfBytes = await doc.save();
    const mockBlob = new Blob([pdfBytes], { type: 'application/pdf' });

    const annotations = {
      highlights: [
        {
          id: '1',
          pageNumber: 1,
          color: '#ff0000',
          rects: [{ top: 100, left: 100, width: 200, height: 20 }]
        }
      ],
      strokes: [],
      stickyNotes: [],
      callouts: []
    };

    const result = await exportAnnotatedPdf(mockBlob, annotations);
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe('application/pdf');
    expect(result.size).toBeGreaterThan(0);
  });
});
