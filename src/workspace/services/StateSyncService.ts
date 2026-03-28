import { z } from 'zod';
import { highlights, strokes, stickyNotes, callouts, persistAnnotations } from '../store/annotation-state';
import { saveWorkspaceHandle } from '../../lib/idb-store';
import { autoSaveFileHandle, isAutoSaveEnabled } from '../store/viewer-state';

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
export async function commitWorkspaceToStore(data: WorkspacePayload, url: string, handle?: any) {
  // 1. Update live signals
  highlights.value = data.highlights;
  strokes.value = data.strokes;
  stickyNotes.value = data.stickyNotes;
  callouts.value = data.callouts;

  // 2. Persist to IDB (Internal cache)
  await persistAnnotations(url);
  
  // 3. Register this document association in storage registry
  registerWorkspace(url, data.documentUrl || 'Untitled Workspace');

  // 4. Auto-link for Pro Sync if handle provided
  if (handle) {
    autoSaveFileHandle.value = handle;
    isAutoSaveEnabled.value = true;
    await saveWorkspaceHandle(url, handle, handle.name);
  }
}

/**
 * Register a doc -> workspace mapping in chrome.storage
 */
export async function registerWorkspace(url: string, sourceName: string) {
  if (typeof chrome === 'undefined' || !chrome.storage) return;
  
  const res = await chrome.storage.local.get('icycrow_workspace_registry');
  const registry: Record<string, any> = res.icycrow_workspace_registry || {};
  
  registry[url] = {
    lastSeen: new Date().toISOString(),
    sourceName
  };
  
  await chrome.storage.local.set({ icycrow_workspace_registry: registry });
}

/**
 * Write data to a FileSystemFileHandle
 */
export async function saveToHandle(handle: any, data: WorkspacePayload) {
  try {
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
    return true;
  } catch (err) {
    console.error("Auto-save to handle failed:", err);
    return false;
  }
}

/**
 * Show file picker and return handle
 */
export async function getSaveHandle(suggestedName: string) {
  try {
    // @ts-ignore - File System Access API
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [{
        description: 'IcyCrow Workspace JSON',
        accept: { 'application/json': ['.json'] },
      }],
    });
    return handle;
  } catch (err) {
    console.error("Picker cancelled or failed:", err);
    return null;
  }
}

/**
 * Verify if we have read/write permission for a handle
 */
export async function verifyPermission(handle: any, mode: 'read' | 'readwrite' = 'readwrite') {
  if (!handle) return false;
  const options = { mode };
  // Check if we already have permission
  if ((await handle.queryPermission(options)) === 'granted') {
    return true;
  }
  // Request permission
  if ((await handle.requestPermission(options)) === 'granted') {
    return true;
  }
  return false;
}

/**
 * Load workspace from a handle
 */
export async function loadFromHandle(handle: any): Promise<WorkspacePayload | null> {
  try {
    const file = await handle.getFile();
    const content = await file.text();
    const parsed = JSON.parse(content);
    return WorkspaceSchema.parse(parsed);
  } catch (err) {
    console.error("Load from handle failed:", err);
    return null;
  }
}
