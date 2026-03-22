import { openDB, IDBPDatabase } from 'idb';
import type { IDBArticle, IDBEmbedding, IDBOnnxModel, IDBBackupManifest, UUID } from './types';

const DB_NAME = 'icycrow-db';
const DB_VERSION = 2;

export async function initDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // v1 stores — only create if not already present
      if (!db.objectStoreNames.contains('articles')) {
        db.createObjectStore('articles', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('embeddings')) {
        db.createObjectStore('embeddings', { keyPath: 'articleId' });
      }
      if (!db.objectStoreNames.contains('onnxModelCache')) {
        db.createObjectStore('onnxModelCache', { keyPath: 'modelName' });
      }

      // v2 — backupManifest store (safe migration guard)
      if (oldVersion < 2) {
        const backups = db.createObjectStore('backupManifest', { keyPath: 'id' });
        backups.createIndex('timestamp', 'timestamp');
      }
    },
  });
}

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
  return db.get('backupManifest', id);
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
