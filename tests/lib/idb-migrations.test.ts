import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { initDB, DB_NAME, DB_VERSION } from '@lib/idb-migrations';
import { deleteDB } from 'idb';

describe('IDB Migrations', () => {
  beforeEach(async () => {
    await deleteDB(DB_NAME);
  });

  it('initializes v1 schema with all 6 stores correctly', async () => {
    const db = await initDB();
    expect(db.name).toBe(DB_NAME);
    expect(db.version).toBe(DB_VERSION);

    const storeNames = Array.from(db.objectStoreNames);
    expect(storeNames).toContain('articles');
    expect(storeNames).toContain('embeddings');
    expect(storeNames).toContain('annotations');
    expect(storeNames).toContain('taskQueue');
    expect(storeNames).toContain('onnxModelCache');
    expect(storeNames).toContain('backupManifest');
    expect(storeNames).toHaveLength(6);

    const tx = db.transaction(storeNames, 'readonly');
    
    const articles = tx.objectStore('articles');
    expect(articles.keyPath).toBe('id');
    const articleIndexes = Array.from(articles.indexNames).sort();
    expect(articleIndexes).toEqual(['savedAt', 'spaceId', 'url']);

    const embeddings = tx.objectStore('embeddings');
    expect(embeddings.keyPath).toBe('articleId');
    expect(Array.from(embeddings.indexNames)).toEqual(['modelVersion']);

    const annotations = tx.objectStore('annotations');
    expect(annotations.keyPath).toBe('id');
    expect(Array.from(annotations.indexNames)).toEqual(['url']);

    const taskQueue = tx.objectStore('taskQueue');
    expect(Array.from(taskQueue.indexNames).sort()).toEqual(['createdAt', 'status']);
    
    const onnxModelCache = tx.objectStore('onnxModelCache');
    expect(onnxModelCache.keyPath).toBe('modelName');
    
    const backupManifest = tx.objectStore('backupManifest');
    expect(backupManifest.keyPath).toBe('id');
    expect(Array.from(backupManifest.indexNames)).toEqual(['timestamp']);

    db.close();
  });
});
