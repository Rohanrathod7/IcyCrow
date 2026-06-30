import { initDB } from './idb-migrations';
import type { WebAnnotationDocument, SHA256Hash } from './types';

/**
 * Save or update web annotations for a specific URL Hash.
 */
export async function saveWebAnnotations(doc: WebAnnotationDocument): Promise<boolean> {
  try {
    const db = await initDB();
    await db.put('web_annotations', {
      ...doc,
      lastUpdated: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('[IcyCrow] Failed to save web annotations:', error);
    return false;
  }
}

/**
 * Fetch web annotations for a specific URL Hash.
 */
export async function getWebAnnotations(urlHash: SHA256Hash): Promise<WebAnnotationDocument | null> {
  try {
    const db = await initDB();
    const doc = await db.get('web_annotations', urlHash);
    return doc || null;
  } catch (error) {
    console.error('[IcyCrow] Failed to fetch web annotations:', error);
    return null;
  }
}
