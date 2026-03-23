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
  try {
    const result = await chrome.storage?.local?.get('settings');
    if (chrome.runtime?.lastError) throw new Error(chrome.runtime.lastError.message);
    return result?.settings as IcyCrowSettings | undefined;
  } catch (err) {
    console.error('[IcyCrow] getSettings error:', err);
    return undefined;
  }
}

export async function setSettings(settings: IcyCrowSettings): Promise<void> {
  try {
    await chrome.storage?.local?.set({ settings });
    if (chrome.runtime?.lastError) throw new Error(chrome.runtime.lastError.message);
  } catch (err) {
    console.error('[IcyCrow] setSettings error:', err);
    throw err;
  }
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

export async function updateHighlights(
  urlHash: string, 
  updater: (highlights: HighlightsStore) => HighlightsStore
): Promise<void> {
  const key = `highlights:${urlHash}`;
  return mutex.withLock(key, async () => {
    const current = await getHighlights(urlHash);
    const updated = updater(current);
    await chrome.storage.local.set({ [key]: updated });
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
    
    // Prune to last 50 messages
    const pruned = history.slice(-50);
    await chrome.storage.local.set({ [key]: pruned });
  });
}

// Spaces
export async function getSpaces(): Promise<SpacesStore> {
  try {
    const result = await chrome.storage?.local?.get('spaces');
    if (chrome.runtime?.lastError) throw new Error(chrome.runtime.lastError.message);
    return (result?.spaces as SpacesStore) || {};
  } catch (err) {
    console.error('[IcyCrow] getSpaces error:', err);
    return {};
  }
}

export async function setSpaces(spaces: SpacesStore): Promise<void> {
  try {
    await chrome.storage?.local?.set({ spaces });
    if (chrome.runtime?.lastError) throw new Error(chrome.runtime.lastError.message);
  } catch (err) {
    console.error('[IcyCrow] setSpaces error:', err);
    throw err;
  }
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
