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
}

export const highlights = signal<Highlight[]>([]);
export const strokes = signal<Stroke[]>([]);

/** Initialize annotations from IndexedDB */
export async function initializeAnnotations(url: string) {
  const data = await getAnnotations(url);
  if (data) {
    highlights.value = data.highlights || [];
    strokes.value = data.strokes || [];
  } else {
    highlights.value = [];
    strokes.value = [];
  }
}

/** Persist current annotations to IndexedDB */
export async function persistAnnotations(url: string) {
  await saveAnnotations(url, {
    highlights: highlights.value,
    strokes: strokes.value
  });
}
