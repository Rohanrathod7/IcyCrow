import { signal } from '@preact/signals';
import { saveAnnotations, getAnnotations } from '../../lib/idb-store';

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
}

export interface StickyNote {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  text: string;
  color: string;
}

export const highlights = signal<Highlight[]>([]);
export const strokes = signal<Stroke[]>([]);
export const stickyNotes = signal<StickyNote[]>([]);
export const activeStickyId = signal<string | null>(null);

/** Initialize annotations from IndexedDB */
export async function initializeAnnotations(url: string) {
  const data = await getAnnotations(url);
  if (data) {
    highlights.value = data.highlights || [];
    strokes.value = data.strokes || [];
    stickyNotes.value = data.stickyNotes || [];
  } else {
    highlights.value = [];
    strokes.value = [];
    stickyNotes.value = [];
  }
}

/** Persist current annotations to IndexedDB */
export async function persistAnnotations(url: string) {
  await saveAnnotations(url, {
    highlights: highlights.value,
    strokes: strokes.value,
    stickyNotes: stickyNotes.value
  });
}

/** Delete a stroke and persist */
export async function deleteStroke(id: string, url: string) {
  strokes.value = strokes.value.filter(s => s.id !== id);
  await persistAnnotations(url);
}

/** Delete a highlight and persist */
export async function deleteHighlight(id: string, url: string) {
  highlights.value = highlights.value.filter(h => h.id !== id);
  await persistAnnotations(url);
}

/** Sticky Note Actions */
export function addSticky(pageNumber: number, x: number, y: number, color: string) {
  const newSticky: StickyNote = {
    id: `sticky-${Date.now()}`,
    pageNumber,
    x,
    y,
    text: '',
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

export function deleteSticky(id: string) {
  stickyNotes.value = stickyNotes.value.filter(s => s.id !== id);
}
