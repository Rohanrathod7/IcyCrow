import { signal } from '@preact/signals';
import { sha256Hash, canonicalUrl } from '../../lib/url-utils';
import type { WebStroke, WebTextAnnotation, WebAnnotationDocument, SHA256Hash, WebStickyNote, WebCallout, WebFlashcardNote } from '../../lib/types';
import { saveWorkspaceHandle, getWorkspaceHandle } from '../../lib/idb-store';

export const webStrokes = signal<WebStroke[]>([]);
export const webTextAnnotations = signal<WebTextAnnotation[]>([]);
export const webStickyNotes = signal<WebStickyNote[]>([]);
export const webCallouts = signal<WebCallout[]>([]);
export const webFlashcardNotes = signal<WebFlashcardNote[]>([]);
export const webHighlights = signal<any[]>([]); // To sync highlights into JSON
export const webActiveStickyId = signal<string | null>(null);
export const webActiveCalloutId = signal<string | null>(null);
export const webActiveFlashcardId = signal<string | null>(null);
export const webDraftCallout = signal<{ anchor: { x: number, y: number }, current: { x: number, y: number } } | null>(null);

export const isWebSidebarOpen = signal<boolean>(false);

// Local JSON Sync State
export const webLinkedFileHandle = signal<FileSystemFileHandle | null>(null);
export const webLinkedFileName = signal<string | null>(null);
export const webSyncStatus = signal<'idle' | 'saving' | 'saved' | 'error' | 'permission-needed' | 'missing'>('idle');

// Reusing workspace tool signals, but defined here if we need web-specific ones.
// We'll actually import the shared ones from workspace/store/viewer-state 
// or define web-specific tool state if we want decoupling. 
// For now, we will create our own decoupled signals for the web toolbar to avoid breaking the PDF viewer.

export const webActiveTool = signal<'cursor' | 'draw' | 'highlight' | 'eraser'>('cursor');
export const webViewerColor = signal<string>('#ef4444');
export const webToolSettings = signal({
  draw: { width: 3, opacity: 1.0 },
  highlight: { mode: 'freehand' as 'freehand' | 'text', width: 16, opacity: 0.4 },
  eraser: { width: 20 },
});

let autoSaveTimer: any = null;
let currentUrlHash: SHA256Hash | null = null;

/**
 * Initializes the state by fetching from IDB via background script.
 */
export async function initWebAnnotations() {
  currentUrlHash = (await sha256Hash(canonicalUrl(window.location.href))) as SHA256Hash;
  
  try {
    const res = await chrome.runtime.sendMessage({
      type: 'WEB_ANNOTATIONS_FETCH',
      payload: { urlHash: currentUrlHash }
    });
    
    if (res && res.ok && res.data.document) {
      const doc = res.data.document as WebAnnotationDocument;
      webStrokes.value = doc.strokes || [];
      webTextAnnotations.value = doc.textAnnotations || [];
      webStickyNotes.value = doc.stickyNotes || [];
      webCallouts.value = doc.callouts || [];
      webFlashcardNotes.value = doc.flashcardNotes || [];
      // We DO NOT hydrate highlights from IDB here. chrome.storage.local is the real-time source of truth.
      // Importing JSON files (which updates highlights) is handled in linkLocalFile().
    } else {
      webStrokes.value = [];
      webTextAnnotations.value = [];
      webStickyNotes.value = [];
      webCallouts.value = [];
      webFlashcardNotes.value = [];
      // webHighlights is hydrated asynchronously below
    }
  } catch (err) {
    console.warn('[IcyCrow] Failed to fetch web annotations:', err);
  }
  
  // Also fetch highlights from storage to hydrate webHighlights for the initial JSON sync state
  if (currentUrlHash) {
    chrome.storage.local.get([`highlights:${currentUrlHash}`], (result) => {
      const h = result[`highlights:${currentUrlHash}`];
      if (h && Array.isArray(h)) {
        webHighlights.value = h;
      }
    });

    // Hydrate local file link
    try {
      const linked = await getWorkspaceHandle(currentUrlHash);
      if (linked && linked.handle) {
        webLinkedFileHandle.value = linked.handle;
        webLinkedFileName.value = linked.filename;
        
        // Check permission state without prompting
        const permission = await (linked.handle as any).queryPermission({ mode: 'readwrite' });
        if (permission === 'prompt') {
          webSyncStatus.value = 'permission-needed';
        } else if (permission === 'denied') {
          webSyncStatus.value = 'error';
        } else {
          // Verify file still exists
          try {
            await linked.handle.getFile();
            webSyncStatus.value = 'saved';
          } catch (e: any) {
            webSyncStatus.value = 'missing';
          }
        }
      }
    } catch (e) {
      console.warn('[IcyCrow] Failed to hydrate local file link:', e);
    }
  }
}

// Listen for highlight changes from content-script so we can trigger JSON autosave
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && currentUrlHash) {
      const key = `highlights:${currentUrlHash}`;
      if (changes[key]) {
        webHighlights.value = (changes[key].newValue as any[]) || [];
        triggerAutoSave();
      }
    }
  });
}

/**
 * Persists the current state to IDB via background script.
 */
export async function persistWebAnnotations() {
  if (!currentUrlHash) return;
  
  const payload = {
    urlHash: currentUrlHash,
    strokes: webStrokes.value,
    textAnnotations: webTextAnnotations.value,
    stickyNotes: webStickyNotes.value,
    callouts: webCallouts.value,
    flashcardNotes: webFlashcardNotes.value,
    highlights: webHighlights.value,
    lastUpdated: new Date().toISOString()
  };

  // 1. Save to Linked Local File if present
  if (webLinkedFileHandle.value) {
    webSyncStatus.value = 'saving';
    try {
      const writable = await webLinkedFileHandle.value.createWritable();
      await writable.write(JSON.stringify(payload, null, 2));
      await writable.close();
      webSyncStatus.value = 'saved';
      setTimeout(() => { if (webSyncStatus.value === 'saved') webSyncStatus.value = 'idle'; }, 2000);
    } catch (err: any) {
      console.warn('[IcyCrow] Failed to auto-save to linked file:', err);
      if (err.name === 'NotFoundError') {
        webSyncStatus.value = 'missing';
      } else if (err.name === 'NotAllowedError') {
        webSyncStatus.value = 'permission-needed';
      } else {
        webSyncStatus.value = 'error';
      }
    }
  }

  // 2. Always backup to Chrome Storage
  chrome.runtime.sendMessage({
    type: 'WEB_ANNOTATIONS_SAVE',
    payload
  }).catch(err => console.warn('[IcyCrow] Failed to save web annotations to IDB:', err));
}

/**
 * Prompts user to link a local JSON file. 
 * Reads the content to hydrate state, and stores the handle for auto-saving.
 */
export async function linkLocalFile() {
  try {
    const [handle] = await (window as any).showOpenFilePicker({
      types: [{
        description: 'IcyCrow Annotation JSON',
        accept: { 'application/json': ['.json'] },
      }],
      multiple: false
    });

    const file = await handle.getFile();
    const text = await file.text();
    
    // Only parse if not completely empty
    if (text.trim().length > 0) {
      const doc = JSON.parse(text) as WebAnnotationDocument & { highlights?: any[] };
      if (doc.strokes || doc.textAnnotations || doc.stickyNotes || doc.callouts || doc.flashcardNotes || doc.highlights) {
        webStrokes.value = doc.strokes || [];
        webTextAnnotations.value = doc.textAnnotations || [];
        webStickyNotes.value = doc.stickyNotes || [];
        webCallouts.value = doc.callouts || [];
        webFlashcardNotes.value = doc.flashcardNotes || [];
        webHighlights.value = doc.highlights || [];
        
        // Sync imported highlights back to chrome.storage so content-script can render them
        if (currentUrlHash && doc.highlights) {
          chrome.storage.local.set({ [`highlights:${currentUrlHash}`]: doc.highlights });
        }
      }
    }

    webLinkedFileHandle.value = handle;
    webLinkedFileName.value = file.name;
    
    if (currentUrlHash) {
      await saveWorkspaceHandle(currentUrlHash, handle, file.name);
    }
    
    webSyncStatus.value = 'idle';
    
    // Trigger a save immediately in case we just linked an empty file and have existing Chrome state
    persistWebAnnotations();
    
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      console.error('[IcyCrow] Failed to link file:', err);
      alert('Failed to link file. Ensure you selected a valid JSON file.');
    }
  }
}

/**
 * Attempts to request permission for the linked file handle
 */
export async function requestFilePermission() {
  if (!webLinkedFileHandle.value) return;
  try {
    const permission = await (webLinkedFileHandle.value as any).requestPermission({ mode: 'readwrite' });
    if (permission === 'granted') {
      webSyncStatus.value = 'idle';
      triggerAutoSave();
    } else {
      webSyncStatus.value = 'error';
    }
  } catch (err) {
    console.error('[IcyCrow] Failed to request permission:', err);
    webSyncStatus.value = 'error';
  }
}

/**
 * Debounced save trigger. Call this after drawing or erasing.
 */
export function triggerAutoSave() {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    persistWebAnnotations();
  }, 0);
}
/**
 * Safely delete a highlight from storage and the local array
 */
export function deleteWebHighlight(id: string) {
  if (!currentUrlHash) return;
  webHighlights.value = webHighlights.value.filter(h => h.id !== id);
  chrome.runtime.sendMessage({ 
    type: 'HIGHLIGHT_DELETE', 
    payload: { urlHash: currentUrlHash, highlightId: id } 
  }).catch(() => {});
  triggerAutoSave();
}
