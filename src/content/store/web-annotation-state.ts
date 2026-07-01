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

function showWebToast(message: string) {
  const existing = document.getElementById('icycrow-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'icycrow-toast';
  toast.textContent = message;
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.85)',
    color: '#fff',
    padding: '10px 20px',
    borderRadius: '12px',
    fontSize: '14px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    zIndex: '2147483647',
    pointerEvents: 'none',
    animation: 'icycrow-toast-in 0.3s ease-out',
    backdropFilter: 'blur(8px)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
  });

  let styleEl = document.getElementById('icycrow-toast-style');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'icycrow-toast-style';
    styleEl.textContent = `
      @keyframes icycrow-toast-in { 0% { opacity:0; transform:translateX(-50%) translateY(12px); } 100% { opacity:1; transform:translateX(-50%) translateY(0); } }
      @keyframes icycrow-toast-out { 0% { opacity:1; } 100% { opacity:0; transform:translateX(-50%) translateY(12px); } }
    `;
    document.head.appendChild(styleEl);
  }

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'icycrow-toast-out 0.3s ease-in forwards';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

function showWebUndoToast(message: string, onUndo: () => void) {
  const existing = document.getElementById('icycrow-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'icycrow-toast';
  
  const textSpan = document.createElement('span');
  textSpan.textContent = message;
  toast.appendChild(textSpan);

  const undoBtn = document.createElement('button');
  undoBtn.textContent = 'Undo';
  Object.assign(undoBtn.style, {
    background: '#3b82f6',
    border: 'none',
    color: '#fff',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    marginLeft: '12px',
    outline: 'none'
  });
  
  undoBtn.addEventListener('click', () => {
    onUndo();
    toast.style.animation = 'icycrow-toast-out 0.3s ease-in forwards';
    setTimeout(() => toast.remove(), 300);
  });
  toast.appendChild(undoBtn);

  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.85)',
    color: '#fff',
    padding: '10px 20px',
    borderRadius: '12px',
    fontSize: '14px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    zIndex: '2147483647',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    animation: 'icycrow-toast-in 0.3s ease-out',
    backdropFilter: 'blur(8px)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
    pointerEvents: 'auto'
  });

  let styleEl = document.getElementById('icycrow-toast-style');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'icycrow-toast-style';
    styleEl.textContent = `
      @keyframes icycrow-toast-in { 0% { opacity:0; transform:translateX(-50%) translateY(12px); } 100% { opacity:1; transform:translateX(-50%) translateY(0); } }
      @keyframes icycrow-toast-out { 0% { opacity:1; } 100% { opacity:0; transform:translateX(-50%) translateY(12px); } }
    `;
    document.head.appendChild(styleEl);
  }

  document.body.appendChild(toast);
  
  const timer = setTimeout(() => {
    toast.style.animation = 'icycrow-toast-out 0.3s ease-in forwards';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
  
  undoBtn.addEventListener('click', () => {
    clearTimeout(timer);
  });
}

let lastDeletedWebItem: {
  type: 'highlight' | 'stroke' | 'sticky' | 'callout' | 'flashcard';
  data: any;
} | null = null;

let activeWebEraseTransaction: Array<{
  type: 'highlight' | 'stroke' | 'sticky' | 'callout' | 'flashcard';
  data: any;
}> | null = null;

export function startWebEraseTransaction() {
  activeWebEraseTransaction = [];
}

export function endWebEraseTransaction() {
  if (!activeWebEraseTransaction || activeWebEraseTransaction.length === 0) {
    activeWebEraseTransaction = null;
    return;
  }

  lastDeletedWebItem = {
    type: 'multiple' as any,
    data: activeWebEraseTransaction
  };
  activeWebEraseTransaction = null;

  const count = lastDeletedWebItem.data.length;
  const message = count === 1 
    ? `${lastDeletedWebItem.data[0].type.charAt(0).toUpperCase() + lastDeletedWebItem.data[0].type.slice(1)} deleted`
    : `Erased ${count} annotations`;

  showWebUndoToast(message, () => {
    if (lastDeletedWebItem && lastDeletedWebItem.type === 'multiple' as any) {
      for (const item of lastDeletedWebItem.data) {
        if (item.type === 'highlight') {
          chrome.runtime.sendMessage({
            type: 'HIGHLIGHT_CREATE',
            payload: {
              url: window.location.href,
              urlHash: currentUrlHash,
              text: item.data.anchor.exact,
              color: item.data.color,
              opacity: item.data.opacity ?? 0.4,
              anchor: item.data.anchor,
              pageMeta: { title: document.title, domFingerprint: currentUrlHash },
              spaceId: null
            }
          }).catch(() => {});
        } else if (item.type === 'stroke') {
          webStrokes.value = [...webStrokes.value, item.data];
        } else if (item.type === 'sticky') {
          webStickyNotes.value = [...webStickyNotes.value, item.data];
        } else if (item.type === 'callout') {
          webCallouts.value = [...webCallouts.value, item.data];
        } else if (item.type === 'flashcard') {
          webFlashcardNotes.value = [...webFlashcardNotes.value, item.data];
        }
      }
      triggerAutoSave();
      lastDeletedWebItem = null;
      showWebToast('Annotations restored!');
    }
  });
}

/**
 * Safely delete a highlight from storage and show undo toast
 */
export function deleteWebHighlight(id: string) {
  if (!currentUrlHash) return;
  const item = webHighlights.value.find(h => h.id === id);
  if (item) {
    chrome.runtime.sendMessage({ 
      type: 'HIGHLIGHT_DELETE', 
      payload: { urlHash: currentUrlHash, highlightId: id } 
    }).catch(() => {});

    if (activeWebEraseTransaction) {
      activeWebEraseTransaction.push({ type: 'highlight', data: item });
    } else {
      lastDeletedWebItem = { type: 'highlight', data: item };
      showWebUndoToast('Highlight deleted', () => {
        if (lastDeletedWebItem && lastDeletedWebItem.type === 'highlight') {
          chrome.runtime.sendMessage({
            type: 'HIGHLIGHT_CREATE',
            payload: {
              url: window.location.href,
              urlHash: currentUrlHash,
              text: lastDeletedWebItem.data.anchor.exact,
              color: lastDeletedWebItem.data.color,
              opacity: lastDeletedWebItem.data.opacity ?? 0.4,
              anchor: lastDeletedWebItem.data.anchor,
              pageMeta: { title: document.title, domFingerprint: currentUrlHash },
              spaceId: null
            }
          }).catch(() => {});
          lastDeletedWebItem = null;
          showWebToast('Highlight restored!');
        }
      });
    }
  }
}

/**
 * Safely delete a stroke and show undo toast
 */
export function deleteWebStroke(id: string) {
  const item = webStrokes.value.find(s => s.id === id);
  if (item) {
    webStrokes.value = webStrokes.value.filter(s => s.id !== id);
    triggerAutoSave();

    if (activeWebEraseTransaction) {
      activeWebEraseTransaction.push({ type: 'stroke', data: item });
    } else {
      lastDeletedWebItem = { type: 'stroke', data: item };
      showWebUndoToast('Drawing deleted', () => {
        if (lastDeletedWebItem && lastDeletedWebItem.type === 'stroke') {
          webStrokes.value = [...webStrokes.value, lastDeletedWebItem.data];
          triggerAutoSave();
          lastDeletedWebItem = null;
          showWebToast('Drawing restored!');
        }
      });
    }
  }
}

/**
 * Safely delete a sticky note and show undo toast
 */
export function deleteWebSticky(id: string) {
  const item = webStickyNotes.value.find(s => s.id === id);
  if (item) {
    webStickyNotes.value = webStickyNotes.value.filter(s => s.id !== id);
    if (webActiveStickyId.value === id) webActiveStickyId.value = null;
    triggerAutoSave();

    if (activeWebEraseTransaction) {
      activeWebEraseTransaction.push({ type: 'sticky', data: item });
    } else {
      lastDeletedWebItem = { type: 'sticky', data: item };
      showWebUndoToast('Note deleted', () => {
        if (lastDeletedWebItem && lastDeletedWebItem.type === 'sticky') {
          webStickyNotes.value = [...webStickyNotes.value, lastDeletedWebItem.data];
          triggerAutoSave();
          lastDeletedWebItem = null;
          showWebToast('Note restored!');
        }
      });
    }
  }
}

/**
 * Safely delete a callout box and show undo toast
 */
export function deleteWebCallout(id: string) {
  const item = webCallouts.value.find(c => c.id === id);
  if (item) {
    webCallouts.value = webCallouts.value.filter(c => c.id !== id);
    if (webActiveCalloutId.value === id) webActiveCalloutId.value = null;
    triggerAutoSave();

    if (activeWebEraseTransaction) {
      activeWebEraseTransaction.push({ type: 'callout', data: item });
    } else {
      lastDeletedWebItem = { type: 'callout', data: item };
      showWebUndoToast('Callout deleted', () => {
        if (lastDeletedWebItem && lastDeletedWebItem.type === 'callout') {
          webCallouts.value = [...webCallouts.value, lastDeletedWebItem.data];
          triggerAutoSave();
          lastDeletedWebItem = null;
          showWebToast('Callout restored!');
        }
      });
    }
  }
}

/**
 * Safely delete a flashcard and show undo toast
 */
export function deleteWebFlashcard(id: string) {
  const item = webFlashcardNotes.value.find(f => f.id === id);
  if (item) {
    webFlashcardNotes.value = webFlashcardNotes.value.filter(f => f.id !== id);
    if (webActiveFlashcardId.value === id) webActiveFlashcardId.value = null;
    triggerAutoSave();

    if (activeWebEraseTransaction) {
      activeWebEraseTransaction.push({ type: 'flashcard', data: item });
    } else {
      lastDeletedWebItem = { type: 'flashcard', data: item };
      showWebUndoToast('Flashcard deleted', () => {
        if (lastDeletedWebItem && lastDeletedWebItem.type === 'flashcard') {
          webFlashcardNotes.value = [...webFlashcardNotes.value, lastDeletedWebItem.data];
          triggerAutoSave();
          lastDeletedWebItem = null;
          showWebToast('Flashcard restored!');
        }
      });
    }
  }
}
