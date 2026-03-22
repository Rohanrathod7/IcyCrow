import { openDB, IDBPDatabase } from 'idb';
import type { IDBArticle, IDBEmbedding, IDBOnnxModel, UUID } from './types';

const DB_NAME = 'icycrow-db';
const DB_VERSION = 1;

export async function initDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('articles')) {
        db.createObjectStore('articles', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('embeddings')) {
        db.createObjectStore('embeddings', { keyPath: 'articleId' });
      }
      if (!db.objectStoreNames.contains('onnxModelCache')) {
        db.createObjectStore('onnxModelCache', { keyPath: 'modelName' });
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
