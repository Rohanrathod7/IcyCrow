import { initDB } from './idb-migrations';
import type { UUID, SHA256Hash } from './types';

export interface WebBookmark {
  id: UUID;
  url: string;
  urlHash: SHA256Hash;
  title: string;
  anchorExact: string | null;   // The selected text snippet (if any)
  anchorData: any | null;       // Full TextQuoteAnchor object (if any)
  scrollYPercent: number;       // Fallback: viewport scroll percentage [0–1]
  favicon: string | null;
  createdAt: string;
  spaceId: UUID | null;
}

export async function saveBookmark(bookmark: WebBookmark): Promise<void> {
  const db = await initDB();
  await db.put('web_bookmarks', bookmark);
}

export async function getBookmarksByUrl(urlHash: SHA256Hash): Promise<WebBookmark[]> {
  const db = await initDB();
  return db.getAllFromIndex('web_bookmarks', 'urlHash', urlHash as string);
}

export async function getAllBookmarks(): Promise<WebBookmark[]> {
  const db = await initDB();
  return db.getAll('web_bookmarks');
}

export async function deleteBookmark(id: UUID): Promise<void> {
  const db = await initDB();
  await db.delete('web_bookmarks', id as string);
}
