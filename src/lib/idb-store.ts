import { initDB } from './idb-migrations';
import type { IDBArticle, IDBEmbedding, IDBOnnxModel, IDBBackupManifest, UUID } from './types';


export async function saveArticle(article: IDBArticle): Promise<void> {
  const db = await initDB();
  await db.put('articles', article);
}

export async function getArticle(id: UUID): Promise<IDBArticle | undefined> {
  const db = await initDB();
  return db.get('articles', id);
}

export async function saveEmbedding(embedding: IDBEmbedding): Promise<void> {
  const db = await initDB();
  await db.put('embeddings', embedding);
}

export async function getEmbedding(articleId: UUID): Promise<IDBEmbedding | undefined> {
  const db = await initDB();
  return db.get('embeddings', articleId);
}

export async function cacheModel(model: IDBOnnxModel): Promise<void> {
  const db = await initDB();
  await db.put('onnxModelCache', model);
}

export async function getCachedModel(modelName: string): Promise<IDBOnnxModel | undefined> {
  const db = await initDB();
  return db.get('onnxModelCache', modelName);
}

export async function getAllEmbeddings(): Promise<IDBEmbedding[]> {
  const db = await initDB();
  return db.getAll('embeddings');
}

export async function getAllArticles(): Promise<IDBArticle[]> {
  const db = await initDB();
  return db.getAll('articles');
}

export async function saveBackupManifest(manifest: IDBBackupManifest): Promise<void> {
  const db = await initDB();
  await db.put('backupManifest', manifest);
}

export async function getBackupManifest(id: string): Promise<IDBBackupManifest | undefined> {
  const db = await initDB();
  return db.get('backupManifest', id as UUID);
}

/**
 * Returns all highlights from chrome.storage.local as a key-value map.
 * Each key has the format `highlights:<urlHash>`.
 */
export async function getAllHighlights(): Promise<Record<string, any[]>> {
  const allData = await chrome.storage.local.get(null);
  return Object.fromEntries(
    Object.entries(allData).filter(([key]) => key.startsWith('highlights:'))
  ) as Record<string, any[]>;
}

/**
 * Returns the spaces map from chrome.storage.local.
 */
export async function getAllSpaces(): Promise<Record<string, any>> {
  const result = await chrome.storage.local.get('spaces');
  return (result.spaces as Record<string, any>) ?? {};
}

export async function savePdfToCache(url: string, buffer: ArrayBuffer): Promise<void> {
  const db = await initDB();
  await db.put('pdf_cache', { url, buffer, savedAt: new Date().toISOString() as any });
}

export async function getPdfFromCache(url: string): Promise<ArrayBuffer | undefined> {
  const db = await initDB();
  const entry = await db.get('pdf_cache', url);
  return entry?.buffer;
}

export async function saveAnnotations(url: string, data: { highlights: any[], strokes: any[], stickyNotes?: any[], callouts?: any[] }): Promise<void> {
  const db = await initDB();
  await db.put('document_annotations', { url, ...data });
}

export async function getAnnotations(url: string): Promise<{ highlights: any[], strokes: any[], stickyNotes?: any[], callouts?: any[] } | undefined> {
  const db = await initDB();
  return db.get('document_annotations', url);
}

export async function saveWorkspaceHandle(url: string, handle: any, filename: string): Promise<void> {
  const db = await initDB();
  await db.put('workspace_handles', { 
    url, 
    handle, 
    filename, 
    lastLinked: new Date().toISOString() 
  });
}

export async function getWorkspaceHandle(url: string): Promise<{ handle: any, filename: string, lastLinked: string } | undefined> {
  const db = await initDB();
  return db.get('workspace_handles', url);
}

export async function deleteWorkspaceHandle(url: string): Promise<void> {
  const db = await initDB();
  await db.delete('workspace_handles', url);
}
