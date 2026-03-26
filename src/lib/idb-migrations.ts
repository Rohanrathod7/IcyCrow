import { openDB, type IDBPDatabase, type IDBPTransaction } from 'idb';
import { IDB_NAME as CONST_DB_NAME } from './constants';

export const DB_NAME = CONST_DB_NAME;
export const DB_VERSION = 4;

// Use 'any' to bypass strict TS issues with idb generics if necessary
type MigrationFn = (db: IDBPDatabase<any>, tx: IDBPTransaction<any, any, any>) => void;

/** Registry of all schema migrations. NEVER delete old entries. */
const MIGRATIONS: Record<number, MigrationFn> = {
  1: (db) => {
    const articles = db.createObjectStore('articles', { keyPath: 'id' });
    articles.createIndex('url', 'url');
    articles.createIndex('savedAt', 'savedAt');
    articles.createIndex('spaceId', 'spaceId');

    const embeddings = db.createObjectStore('embeddings', { keyPath: 'articleId' });
    embeddings.createIndex('modelVersion', 'modelVersion');

    const annotations = db.createObjectStore('annotations', { keyPath: 'id' });
    annotations.createIndex('url', 'url');

    const taskQueue = db.createObjectStore('taskQueue', { keyPath: 'id' });
    taskQueue.createIndex('status', 'status');
    taskQueue.createIndex('createdAt', 'createdAt');

    db.createObjectStore('onnxModelCache', { keyPath: 'modelName' });

    const backups = db.createObjectStore('backupManifest', { keyPath: 'id' });
    backups.createIndex('timestamp', 'timestamp');
  },
  2: () => {
    // Version 2 was backupManifest store (handled in v1 logic for fresh installs)
  },
  3: (_db, tx) => {
    const annotations = tx.objectStore('annotations') as any;
    annotations.createIndex('pageNumber', 'data.pageNumber');
  },
  4: (db) => {
    if (!db.objectStoreNames.contains('pdf_cache')) {
      db.createObjectStore('pdf_cache', { keyPath: 'url' });
    }
  }
};

export async function initDB(): Promise<IDBPDatabase<any>> {
  return openDB<any>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      for (let version = oldVersion + 1; version <= (newVersion || DB_VERSION); version++) {
        const migration = MIGRATIONS[version];
        if (typeof migration === 'function') {
          migration(db, transaction);
        }
      }
    },
  });
}
