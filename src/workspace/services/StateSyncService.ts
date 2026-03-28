import { highlights, strokes, stickyNotes, callouts, persistAnnotations } from '../store/annotation-state';

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
export async function exportWorkspace(pdfFilename: string = 'notes') {
  const payload = {
    version: '1.0',
    highlights: highlights.value,
    strokes: strokes.value,
    stickyNotes: stickyNotes.value,
    callouts: callouts.value,
    exportedAt: new Date().toISOString()
  };

  const dataStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const dlAnchorElem = document.createElement('a');
  dlAnchorElem.setAttribute("href", url);
  dlAnchorElem.setAttribute("download", getExportFilename(pdfFilename.replace(/\.[^/.]+$/, '')));
  dlAnchorElem.click();
  
  // Cleanup
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Import workspace state from a JSON file
 */
export async function importWorkspace(file: File, url: string): Promise<boolean> {
  // Check for existing data before overwriting
  const hasData = highlights.value.length > 0 || 
                  strokes.value.length > 0 || 
                  stickyNotes.value.length > 0 || 
                  callouts.value.length > 0;

  if (hasData) {
    const confirmed = window.confirm("Loading this workspace will overwrite your current notes for this document. Are you sure you want to continue?");
    if (!confirmed) return false;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);

        // Basic schema validation
        if (!parsed.highlights || !parsed.strokes) {
          throw new Error("Invalid workspace file format.");
        }

        // 1. Update live signals
        highlights.value = parsed.highlights || [];
        strokes.value = parsed.strokes || [];
        stickyNotes.value = parsed.stickyNotes || [];
        callouts.value = parsed.callouts || [];

        // 2. Persist to IDB
        await persistAnnotations(url);

        resolve(true);
      } catch (err) {
        console.error("Import failed:", err);
        alert("Failed to import workspace: Invalid file.");
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("File read error"));
    reader.readAsText(file);
  });
}
