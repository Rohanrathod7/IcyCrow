import { embed, topK, loadModel } from '../lib/embedding-worker';
import { getCachedModel, cacheModel } from '../lib/idb-store';
import type { InferenceSession } from 'onnxruntime-web';

let modelSession: InferenceSession | null = null;

async function initModel() {
  if (modelSession) return modelSession;

  // 1. Try IDB Cache
  const cached = await getCachedModel('all-MiniLM-L6-v2');
  if (cached) {
    const blob = new Blob([cached.modelData], { type: 'application/octet-stream' });
    modelSession = await loadModel(blob);
    return modelSession;
  }

  // 2. Fetch from assets
  const response = await fetch(chrome.runtime.getURL('assets/model.onnx'));
  const arrayBuffer = await response.arrayBuffer();
  
  // 3. Cache it
  await cacheModel({
    modelName: 'all-MiniLM-L6-v2',
    modelData: arrayBuffer,
    version: 1,
    cachedAt: new Date().toISOString() as any
  });

  const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
  modelSession = await loadModel(blob);
  return modelSession;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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

async function handleEmbed(payload: { text: string }, sendResponse: (res: any) => void) {
  try {
    const session = await initModel();
    const vector = await embed(payload.text, session);
    sendResponse({ ok: true, data: { vector: Array.from(vector) } });
  } catch (error: any) {
    sendResponse({ ok: false, error: error.message });
  }
}

async function handleBatchEmbed(payload: { articles: any[] }, sendResponse: (res: any) => void) {
  try {
    const session = await initModel();
    const results = await Promise.all(payload.articles.map(async (art) => {
      const vector = await embed(art.content || art.title, session);
      return { articleId: art.id, vector: Array.from(vector) };
    }));
    sendResponse({ ok: true, data: { embeddings: results } });
  } catch (error: any) {
    sendResponse({ ok: false, error: error.message });
  }
}

async function handleSearch(payload: { query: string, stored: any[], topKCount: number }, sendResponse: (res: any) => void) {
  try {
    const session = await initModel();
    const queryVector = await embed(payload.query, session);
    
    // Convert stored vectors back to Float32Array
    const storedWithVectors = payload.stored.map(s => ({
      ...s,
      vector: new Float32Array(s.vector)
    }));

    const results = topK(queryVector, storedWithVectors, payload.topKCount);
    sendResponse({ ok: true, data: { results } });
  } catch (error: any) {
    sendResponse({ ok: false, error: error.message });
  }
}
