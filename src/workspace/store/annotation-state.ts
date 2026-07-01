import { signal } from '@preact/signals';
import { saveAnnotations, getAnnotations } from '../../lib/idb-store';
import { showSyncToast } from '../components/SyncToast';

export const lastDeletedItems = signal<{
  items: Array<{
    type: 'highlight' | 'stroke' | 'sticky' | 'callout';
    data: any;
  }>;
  url: string;
} | null>(null);

let activeEraseTransaction: Array<{
  type: 'highlight' | 'stroke' | 'sticky' | 'callout';
  data: any;
}> | null = null;

export function startEraseTransaction() {
  activeEraseTransaction = [];
}

export async function endEraseTransaction(url: string) {
  if (!activeEraseTransaction || activeEraseTransaction.length === 0) {
    activeEraseTransaction = null;
    return;
  }
  
  lastDeletedItems.value = {
    items: activeEraseTransaction,
    url
  };
  activeEraseTransaction = null;

  const count = lastDeletedItems.value.items.length;
  const message = count === 1 
    ? `${lastDeletedItems.value.items[0].type.charAt(0).toUpperCase() + lastDeletedItems.value.items[0].type.slice(1)} deleted`
    : `Erased ${count} annotations`;

  showUndoToast(message, url);
}

function showUndoToast(messageText: string, url: string) {
  showSyncToast(messageText, 'info', 'Undo', async () => {
    const transaction = lastDeletedItems.value;
    if (!transaction) return;
    
    let newHighlights = [...highlights.value];
    let newStrokes = [...strokes.value];
    let newStickies = [...stickyNotes.value];
    let newCallouts = [...callouts.value];
    
    for (const item of transaction.items) {
      if (item.type === 'highlight') {
        newHighlights.push(item.data);
      } else if (item.type === 'stroke') {
        newStrokes.push(item.data);
      } else if (item.type === 'sticky') {
        newStickies.push(item.data);
      } else if (item.type === 'callout') {
        newCallouts.push(item.data);
      }
    }
    
    highlights.value = newHighlights;
    strokes.value = newStrokes;
    stickyNotes.value = newStickies;
    callouts.value = newCallouts;
    
    await persistAnnotations(url);
    lastDeletedItems.value = null;
    showSyncToast('Restored!', 'success');
  });
}

export interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface Highlight {
  id: string;
  pageNumber: number;
  rects: HighlightRect[];
  color: string;
  opacity?: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  pageNumber: number;
  points: Point[];
  color: string;
  width: number;
  opacity?: number;
  isHighlight?: boolean;
}

export interface StickyNote {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  text: string;
  color: string;
}

export interface Callout {
  id: string;
  pageNumber: number;
  anchor: Point;
  box: Point;
  text: string;
  color: string;
}

export const highlights = signal<Highlight[]>([]);
export const strokes = signal<Stroke[]>([]);
export const stickyNotes = signal<StickyNote[]>([]);
export const callouts = signal<Callout[]>([]);

export const activeStickyId = signal<string | null>(null);
export const activeCalloutId = signal<string | null>(null);
export const draftCallout = signal<{ anchor: Point, current: Point, pageNumber: number } | null>(null);

/** Initialize annotations from IndexedDB */
export async function initializeAnnotations(url: string) {
  const data = await getAnnotations(url);
  if (data) {
    highlights.value = data.highlights || [];
    strokes.value = data.strokes || [];
    stickyNotes.value = data.stickyNotes || [];
    callouts.value = data.callouts || [];
  } else {
    highlights.value = [];
    strokes.value = [];
    stickyNotes.value = [];
    callouts.value = [];
  }
}

/** Persist current annotations to IndexedDB */
export async function persistAnnotations(url: string) {
  await saveAnnotations(url, {
    highlights: highlights.value,
    strokes: strokes.value,
    stickyNotes: stickyNotes.value,
    callouts: callouts.value
  });
}

/** Delete a stroke and persist */
export async function deleteStroke(id: string, url: string) {
  const item = strokes.value.find(s => s.id === id);
  if (item) {
    strokes.value = strokes.value.filter(s => s.id !== id);
    await persistAnnotations(url);
    
    if (activeEraseTransaction) {
      activeEraseTransaction.push({ type: 'stroke', data: item });
    } else {
      lastDeletedItems.value = {
        items: [{ type: 'stroke', data: item }],
        url
      };
      showUndoToast('Drawing deleted', url);
    }
  }
}

/** Delete a highlight and persist */
export async function deleteHighlight(id: string, url: string) {
  const item = highlights.value.find(h => h.id === id);
  if (item) {
    highlights.value = highlights.value.filter(h => h.id !== id);
    await persistAnnotations(url);
    
    if (activeEraseTransaction) {
      activeEraseTransaction.push({ type: 'highlight', data: item });
    } else {
      lastDeletedItems.value = {
        items: [{ type: 'highlight', data: item }],
        url
      };
      showUndoToast('Highlight deleted', url);
    }
  }
}

/** Sticky Note Actions */
export function addSticky(pageNumber: number, x: number, y: number, color: string, text: string = '') {
  const newSticky: StickyNote = {
    id: `sticky-${Date.now()}`,
    pageNumber,
    x,
    y,
    text,
    color
  };
  stickyNotes.value = [...stickyNotes.value, newSticky];
  activeStickyId.value = newSticky.id;
}

export function updateStickyText(id: string, text: string) {
  stickyNotes.value = stickyNotes.value.map(s => 
    s.id === id ? { ...s, text } : s
  );
}

export function updateStickyPosition(id: string, x: number, y: number) {
  stickyNotes.value = stickyNotes.value.map(s => 
    s.id === id ? { ...s, x, y } : s
  );
}

export async function deleteSticky(id: string, url: string) {
  const item = stickyNotes.value.find(s => s.id === id);
  if (item) {
    stickyNotes.value = stickyNotes.value.filter(s => s.id !== id);
    await persistAnnotations(url);
    
    if (activeEraseTransaction) {
      activeEraseTransaction.push({ type: 'sticky', data: item });
    } else {
      lastDeletedItems.value = {
        items: [{ type: 'sticky', data: item }],
        url
      };
      showUndoToast('Note deleted', url);
    }
  }
}

/** Callout Actions */
export function addCallout(pageNumber: number, anchor: Point, box: Point, color: string) {
  const newCallout: Callout = {
    id: `callout-${Date.now()}`,
    pageNumber,
    anchor,
    box,
    text: '',
    color
  };
  callouts.value = [...callouts.value, newCallout];
  activeCalloutId.value = newCallout.id;
}

export function updateCalloutText(id: string, text: string) {
  callouts.value = callouts.value.map(c => 
    c.id === id ? { ...c, text } : c
  );
}

export function updateCalloutBoxPosition(id: string, x: number, y: number) {
  callouts.value = callouts.value.map(c => 
    c.id === id ? { ...c, box: { x, y } } : c
  );
}

export async function deleteCallout(id: string, url: string) {
  const item = callouts.value.find(c => c.id === id);
  if (item) {
    callouts.value = callouts.value.filter(c => c.id !== id);
    await persistAnnotations(url);
    
    if (activeEraseTransaction) {
      activeEraseTransaction.push({ type: 'callout', data: item });
    } else {
      lastDeletedItems.value = {
        items: [{ type: 'callout', data: item }],
        url
      };
      showUndoToast('Callout deleted', url);
    }
  }
}
