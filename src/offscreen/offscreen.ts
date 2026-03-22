import { embed, topK, loadModel } from '../lib/embedding-worker';
import { 
  getCachedModel, 
  cacheModel, 
  getAllArticles, 
  getAllHighlights, 
  getAllSpaces, 
  getAllEmbeddings,
  saveArticle,
  saveEmbedding
} from '../lib/idb-store';
import { exportWorkspace, importWorkspace, EXPORT_LIMIT_BYTES } from '../lib/export-worker';
import type { WorkspaceBundle } from '../lib/types';
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
  if (message.type === 'EXPORT_WORKSPACE') {
    handleExport(message.payload, sendResponse);
    return true;
  }
  if (message.type === 'IMPORT_WORKSPACE') {
    handleImport(message.payload, sendResponse);
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

async function handleExport(payload: { password: string }, sendResponse: (res: any) => void) {
  try {
    // 1. Collect all data
    const [articles, embeddings, highlights, spaces] = await Promise.all([
      getAllArticles(),
      getAllEmbeddings(),
      getAllHighlights(),
      getAllSpaces()
    ]);

    const bundle: WorkspaceBundle = {
      articles,
      embeddings,
      highlights,
      spaces,
      chatHistories: [] // Chat history implementation pending in S11
    };

    const buffer = await exportWorkspace(bundle, payload.password);
    
    // 3. Size Guard
    if (buffer.byteLength > EXPORT_LIMIT_BYTES) {
      sendResponse({ ok: false, error: { code: 'EXPORT_TOO_LARGE', message: 'Workspace data exceeds 50MB limit' } });
      return;
    }

    sendResponse({ ok: true, data: { buffer } });
  } catch (error: any) {
    console.error('[IcyCrow] Export failed:', error);
    sendResponse({ ok: false, error: { code: 'EXPORT_FAILURE', message: error.message } });
  }
}

async function handleImport(payload: { arrayBuffer: ArrayBuffer, password: string }, sendResponse: (res: any) => void) {
  try {
    // 1. Decrypt and verify
    const bundle = await importWorkspace(payload.arrayBuffer, payload.password);

    // 2. Restore data - Batch processed to avoid IDB congestion
    const BATCH_SIZE = 50;
    
    const chunkify = <T>(arr: T[], size: number): T[][] => {
      const chunks: T[][] = [];
      for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
      }
      return chunks;
    };

    // Restore Articles in batches
    for (const chunk of chunkify(bundle.articles, BATCH_SIZE)) {
      await Promise.all(chunk.map(art => saveArticle(art)));
    }

    // Restore Embeddings in batches
    for (const chunk of chunkify(bundle.embeddings, BATCH_SIZE)) {
      await Promise.all(chunk.map(emb => saveEmbedding(emb)));
    }

    // 3. Restore Storage (Highlights and Spaces)
    const storageUpdates: Record<string, any> = {
      ...bundle.highlights,
      spaces: bundle.spaces
    };
    await chrome.storage.local.set(storageUpdates);

    sendResponse({
      ok: true,
      data: {
        stats: {
          articles: bundle.articles.length,
          spaces: Object.keys(bundle.spaces).length,
          highlights: Object.keys(bundle.highlights).length,
          chatMessages: bundle.chatHistories.length
        }
      }
    });
  } catch (error: any) {
    console.error('[IcyCrow] Import failed:', error);
    sendResponse({
      ok: false,
      error: {
        code: error.message === 'HMAC_VERIFICATION_FAILED' ? 'HMAC_VERIFICATION_FAILED' :
              error.message === 'DECRYPTION_FAILED' ? 'DECRYPTION_FAILED' :
              'IMPORT_FAILURE',
        message: error.message
      }
    });
  }
}
