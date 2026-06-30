import { initDB } from './idb-migrations';
import type { UUID, SHA256Hash } from './types';

export interface Flashcard {
  id: UUID;
  highlightId: UUID;
  urlHash: SHA256Hash;
  front: string;
  back: string;
  createdAt: string;
  // SM-2 Spaced Repetition Fields
  interval: number;        // Days until next review
  repetition: number;      // Number of successful reviews
  easeFactor: number;      // Difficulty multiplier (default 2.5)
  nextReviewAt: string;    // ISO timestamp
}

export async function saveFlashcard(card: Flashcard): Promise<void> {
  const db = await initDB();
  await db.put('flashcards', card);
}

export async function getFlashcardsByHighlight(highlightId: UUID): Promise<Flashcard[]> {
  const db = await initDB();
  return db.getAllFromIndex('flashcards', 'highlightId', highlightId as string);
}

export async function getFlashcardsByUrl(urlHash: SHA256Hash): Promise<Flashcard[]> {
  const db = await initDB();
  return db.getAllFromIndex('flashcards', 'urlHash', urlHash as string);
}

export async function getAllFlashcards(): Promise<Flashcard[]> {
  const db = await initDB();
  return db.getAll('flashcards');
}

/**
 * Returns flashcards whose nextReviewAt is <= current time.
 * Sorted by nextReviewAt ascending (most overdue first).
 */
export async function getFlashcardsDueForReview(): Promise<Flashcard[]> {
  const db = await initDB();
  const all = await db.getAll('flashcards');
  const now = new Date().toISOString();
  return all
    .filter(card => card.nextReviewAt <= now)
    .sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt));
}

export async function updateFlashcard(id: UUID, updates: Partial<Flashcard>): Promise<void> {
  const db = await initDB();
  const existing = await db.get('flashcards', id as string);
  if (!existing) throw new Error(`Flashcard ${id} not found`);
  const updated = { ...existing, ...updates };
  await db.put('flashcards', updated);
}

export async function deleteFlashcard(id: UUID): Promise<void> {
  const db = await initDB();
  await db.delete('flashcards', id as string);
}

/**
 * Delete all flashcards linked to a specific highlight.
 * Called when a highlight is deleted to clean up orphans.
 */
export async function deleteFlashcardsByHighlight(highlightId: UUID): Promise<number> {
  const db = await initDB();
  const cards = await db.getAllFromIndex('flashcards', 'highlightId', highlightId as string);
  const tx = db.transaction('flashcards', 'readwrite');
  for (const card of cards) {
    await tx.store.delete(card.id as string);
  }
  await tx.done;
  return cards.length;
}
