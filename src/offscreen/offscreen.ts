import { embed, topK, loadModel } from '../lib/embedding-worker';
import { getCachedModel, cacheModel } from '../lib/idb-store';
import type { InferenceSession } from 'onnxruntime-web';

let modelSession: InferenceSession | null = null;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 30000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs))
  ]);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Security: Verify sender is our own extension
  if (sender.id !== chrome.runtime.id) {
    console.warn('[IcyCrow] Blocked message to offscreen from external sender:', sender.id);
    return false; 
  }

  if (message.type === 'EMBED_TEXT') {
    handleEmbed(message.payload, sendResponse);
    return true; // async
  }
  if (message.type === 'BATCH_EMBED') {
    handleBatchEmbed(message.payload, sendResponse);
    return true;
  }
  if (message.type === 'SEMANTIC_SEARCH') {
    handleSearch(message.payload, sendResponse);
    return true;
  }
});

async function initModel() {
  if (modelSession) return modelSession;

  try {
    // 1. Try IDB Cache
    const cached = await getCachedModel('all-MiniLM-L6-v2');
    if (cached) {
      const blob = new Blob([cached.modelData], { type: 'application/octet-stream' });
      modelSession = await loadModel(blob);
      return modelSession;
    }

    // 2. Fetch from assets
    const response = await fetch(chrome.runtime.getURL('assets/model.onnx'));
    if (!response.ok) {
      throw new Error(`Model fetch failed: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    
    // 3. Cache it (non-blocking, don't fail the whole request if cache fails)
    try {
      await cacheModel({
        modelName: 'all-MiniLM-L6-v2',
        modelData: arrayBuffer,
        version: 1,
        cachedAt: new Date().toISOString() as any
      });
    } catch (cacheError) {
      console.warn('[IcyCrow] Failed to cache model in IDB (Quota?):', cacheError);
    }

    const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
    modelSession = await loadModel(blob);
    return modelSession;
  } catch (err: any) {
    console.error('[IcyCrow] Model initialization failed:', err);
    throw err;
  }
}

async function handleEmbed(payload: { text: string }, sendResponse: (res: any) => void) {
  try {
    const session = await initModel();
    const vector = await withTimeout(embed(payload.text, session));
    sendResponse({ ok: true, data: { vector: Array.from(vector) } });
  } catch (error: any) {
    sendResponse({ ok: false, error: { code: 'EMBED_FAILURE', message: error.message } });
  }
}

async function handleBatchEmbed(payload: { articles: any[] }, sendResponse: (res: any) => void) {
  try {
    const session = await initModel();
    const results = await withTimeout(Promise.all(payload.articles.map(async (art) => {
      const vector = await embed(art.content || art.title, session);
      return { articleId: art.id, vector: Array.from(vector) };
    })));
    sendResponse({ ok: true, data: { embeddings: results } });
  } catch (error: any) {
    sendResponse({ ok: false, error: { code: 'BATCH_EMBED_FAILURE', message: error.message } });
  }
}

async function handleSearch(payload: { query: string, stored: any[], topKCount: number }, sendResponse: (res: any) => void) {
  try {
    const session = await initModel();
    const queryVector = await withTimeout(embed(payload.query, session));
    
    // Convert stored vectors back to Float32Array
    const storedWithVectors = payload.stored.map(s => ({
      ...s,
      vector: new Float32Array(s.vector)
    }));

    const results = topK(queryVector, storedWithVectors, payload.topKCount);
    sendResponse({ ok: true, data: { results } });
  } catch (error: any) {
    sendResponse({ ok: false, error: { code: 'SEARCH_FAILURE', message: error.message } });
  }
}
