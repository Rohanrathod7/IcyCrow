import { initDB } from './idb-migrations';
import { StorageMutex } from './storage-mutex';
import type { 
  IcyCrowSettings, 
  HighlightsStore, 
  ChatHistoryStore, 
  SpacesStore, 
  IDBArticle, 
  IDBEmbedding,
  ChatMessage
} from './types';

const mutex = new StorageMutex();
let dbPromise: ReturnType<typeof initDB> | null = null;

export async function getDB() {
  if (!dbPromise) {
    dbPromise = initDB();
  }
  return dbPromise;
}

export async function _closeDBForTests() {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
}

// Settings
export async function getSettings(): Promise<IcyCrowSettings | undefined> {
  const result = await chrome.storage.local.get('settings');
  return result.settings as IcyCrowSettings | undefined;
}

export async function setSettings(settings: IcyCrowSettings): Promise<void> {
  await chrome.storage.local.set({ settings });
}

// Highlights (Mutex-protected)
export async function getHighlights(urlHash: string): Promise<HighlightsStore> {
  const key = `highlights:${urlHash}`;
  const result = await chrome.storage.local.get(key);
  return (result[key] as HighlightsStore) || [];
}

export async function setHighlights(urlHash: string, data: HighlightsStore): Promise<void> {
  const key = `highlights:${urlHash}`;
  return mutex.withLock(key, async () => {
    await chrome.storage.local.set({ [key]: data });
  });
}

// Chat History (Mutex-protected)
export async function getChatHistory(spaceId: string): Promise<ChatHistoryStore> {
  const key = `chatHistories:${spaceId}`;
  const result = await chrome.storage.local.get(key);
  return (result[key] as ChatHistoryStore) || [];
}

export async function appendChatMessage(spaceId: string, msg: ChatMessage): Promise<void> {
  const key = `chatHistories:${spaceId}`;
  return mutex.withLock(key, async () => {
    const history = await getChatHistory(spaceId);
    history.push(msg);
    await chrome.storage.local.set({ [key]: history });
  });
}

// Spaces
export async function getSpaces(): Promise<SpacesStore> {
  const result = await chrome.storage.local.get('spaces');
  return (result.spaces as SpacesStore) || {};
}

export async function setSpaces(spaces: SpacesStore): Promise<void> {
  await chrome.storage.local.set({ spaces });
}

// IDB Articles
export async function getArticle(id: string): Promise<IDBArticle | undefined> {
  const db = await getDB();
  return db.get('articles', id);
}

export async function saveArticle(article: IDBArticle): Promise<void> {
  const db = await getDB();
  await db.put('articles', article);
}

export async function getAllArticles(): Promise<IDBArticle[]> {
  const db = await getDB();
  return db.getAll('articles');
}

// IDB Embeddings
export async function getEmbedding(articleId: string): Promise<IDBEmbedding | undefined> {
  const db = await getDB();
  return db.get('embeddings', articleId);
}

export async function saveEmbedding(embedding: IDBEmbedding): Promise<void> {
  const db = await getDB();
  await db.put('embeddings', embedding);
}
