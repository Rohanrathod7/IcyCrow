import { z } from 'zod';
import { highlights, strokes, stickyNotes, callouts, persistAnnotations } from '../store/annotation-state';

/**
 * Zod Schema for strict validation
 */
export const WorkspaceSchema = z.object({
  version: z.string(),
  documentUrl: z.string().optional(),
  pageCount: z.number().optional(),
  highlights: z.array(z.any()),
  strokes: z.array(z.any()),
  stickyNotes: z.array(z.any()),
  callouts: z.array(z.any()),
  exportedAt: z.string()
});

export type WorkspacePayload = z.infer<typeof WorkspaceSchema>;

/**
 * Clean filename with timestamp
 */
function getExportFilename(baseName: string = 'workspace'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `icycrow_${baseName}_${timestamp}.json`;
}

/**
 * Export current workspace state to a JSON file
 */
export async function exportWorkspace(url: string, pageCount: number, pdfFilename: string = 'notes') {
  const payload: WorkspacePayload = {
    version: '1.0',
    documentUrl: url,
    pageCount: pageCount,
    highlights: highlights.value,
    strokes: strokes.value,
    stickyNotes: stickyNotes.value,
    callouts: callouts.value,
    exportedAt: new Date().toISOString()
  };

  const dataStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const urlBlob = URL.createObjectURL(blob);
  
  const dlAnchorElem = document.createElement('a');
  dlAnchorElem.setAttribute("href", urlBlob);
  dlAnchorElem.setAttribute("download", getExportFilename(pdfFilename.replace(/\.[^/.]+$/, '')));
  dlAnchorElem.click();
  
  // Cleanup
  setTimeout(() => URL.revokeObjectURL(urlBlob), 100);
}

/**
 * Validate a workspace file and return the parsed data
 */
export async function validateWorkspaceFile(file: File): Promise<WorkspacePayload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        const validated = WorkspaceSchema.parse(parsed);
        resolve(validated);
      } catch (err) {
        console.error("Validation failed:", err);
        reject(new Error("Invalid workspace file format."));
      }
    };
    reader.onerror = () => reject(new Error("File read error"));
    reader.readAsText(file);
  });
}

/**
 * Commit validated data to the store and IDB
 */
export async function commitWorkspaceToStore(data: WorkspacePayload, url: string) {
  // 1. Update live signals
  highlights.value = data.highlights;
  strokes.value = data.strokes;
  stickyNotes.value = data.stickyNotes;
  callouts.value = data.callouts;

  // 2. Persist to IDB
  await persistAnnotations(url);
}
