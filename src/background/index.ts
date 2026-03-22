import { DEFAULT_SETTINGS } from '@lib/constants';
import type { SessionState, Highlight } from '@lib/types';
import { InboundMessageSchema, type ValidatedInboundMessage } from '@lib/zod-schemas';
import { cryptoManager } from './crypto-manager';
import { getHighlights, updateHighlights } from '@lib/storage';
import { taskQueue } from '@lib/task-queue';
import { watchGeminiTab } from './gemini-detector';
import { GEMINI_SELECTORS } from '@lib/gemini-selectors';
import { offscreenManager } from './offscreen-manager';
import { saveArticle, saveEmbedding, getAllEmbeddings, saveBackupManifest } from '@lib/idb-store';
import { validateExportPassword } from '@lib/export-worker';
import type { IDBArticle, UUID, ISOTimestamp } from '@lib/types';

console.log('IcyCrow MV3 Service Worker installed.');

/**
 * Handle hotkey commands
 * Following Phase 4 Wiring Rules
 */
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'highlight-selection') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'COMMAND_HIGHLIGHT' });
    }
  }
});

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    const existing = await chrome.storage.local.get('settings');
    if (!existing.settings) {
      await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
      console.log('Initialized default settings.');
    }
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepalive') {
    // No-op to reset SW idle timer
  } else if (alarm.name === 'crypto-autolock') {
    cryptoManager.checkAutoLock();
  }
});

export async function boot() {
  const result = await chrome.storage.session.get('sessionState');
  const currentState: SessionState = (result.sessionState as SessionState) || {
    swRestartCount: 0,
    cryptoKeyUnlocked: false,
    geminiTabId: null,
    geminiBridgeHealthy: false,
    lastSelectorCheckAt: null,
    cryptoKeyLastUsedAt: null,
    swBootedAt: new Date().toISOString() as any
  };

  const newState: SessionState = {
    ...currentState,
    swRestartCount: currentState.swRestartCount + 1,
    cryptoKeyUnlocked: false, // Must reset on wake, ephemeral
    swBootedAt: new Date().toISOString() as any
  };

  await chrome.storage.session.set({ sessionState: newState });
  console.log(`[IcyCrow] SW Booted: Restart #${newState.swRestartCount}`);
  
  chrome.alarms.create('keepalive', { periodInMinutes: 0.4 });
  chrome.alarms.create('crypto-autolock', { periodInMinutes: 1.0 });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Security: Verify sender is our own extension
  if (sender.id !== chrome.runtime.id) {
    console.warn('[IcyCrow] Blocked message from external sender:', sender.id);
    return false;
  }

  const result = InboundMessageSchema.safeParse(request);
  
  if (!result.success) {
    sendResponse({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: result.error.message
      }
    });
    return false;
  }

  handleMessage(result.data, sendResponse);
  return true; // Keep channel open
});

/**
 * Main message router - Decomposed for audit compliance
 */
export async function handleMessage(
  message: ValidatedInboundMessage,
  sendResponse: (response: any) => void
) {
  try {
    switch (message.type) {
      case 'HIGHLIGHT_CREATE':
      case 'HIGHLIGHTS_FETCH':
      case 'HIGHLIGHT_DELETE':
      case 'HIGHLIGHT_UPDATE':
        return await handleHighlightMessage(message, sendResponse);

      case 'CRYPTO_UNLOCK':
      case 'CRYPTO_LOCK':
        return await handleCryptoMessage(message, sendResponse);

      case 'SCRAPE_CONTENT':
        return await handleScrapeMessage(sendResponse);

      case 'ARTICLE_SAVE':
        return await handleArticleMessage(message, sendResponse);

      case 'AI_QUERY':
      case 'AI_QUERY_STATUS':
      case 'GEMINI_HEALTH_CHECK':
        return await handleAiMessage(message, sendResponse);

      default:
        sendResponse({
          ok: false,
          error: {
            code: 'NOT_IMPLEMENTED',
            message: `Handler for ${message.type} not yet implemented`
          }
        });
    }
  } catch (err: any) {
    sendResponse({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message || 'Unknown error'
      }
    });
  }
}

/**
 * Domain Handler: Highlights
 */
async function handleHighlightMessage(message: ValidatedInboundMessage, sendResponse: (r: any) => void) {
  switch (message.type) {
    case 'HIGHLIGHT_CREATE': {
      const hId = crypto.randomUUID();
      const createdAt = new Date().toISOString() as any;
      
      try {
        let alreadyExists = false;
        let existingData: { id: string, createdAt: string } | null = null;

        await updateHighlights(message.payload.urlHash, (highlights) => {
          const existing = highlights.find(h => 
            h.anchor.exact === message.payload.anchor.exact && h.url === message.payload.url
          );
          if (existing) {
            alreadyExists = true;
            existingData = { id: existing.id, createdAt: existing.createdAt };
            return highlights;
          }

          const newHighlight: Highlight = {
            ...message.payload,
            id: hId as any,
            createdAt,
            note: null
          };
          return [...highlights, newHighlight];
        });

        if (alreadyExists && existingData) {
          sendResponse({ ok: true, data: existingData });
        } else {
          sendResponse({ ok: true, data: { id: hId, createdAt } });
        }
      } catch (err: any) {
        sendResponse({ 
          ok: false, 
          error: { code: 'STORAGE_FAILURE', message: err.message || 'Quota exceeded' } 
        });
      }
      break;
    }

    case 'HIGHLIGHTS_FETCH': {
      const highlights = await getHighlights(message.payload.urlHash);
      const pageChanged = highlights.length > 0 && 
          highlights[0].pageMeta.domFingerprint !== message.payload.currentDomFingerprint;
      sendResponse({
        ok: true,
        data: { highlights, pageChanged }
      });
      break;
    }

    case 'HIGHLIGHT_DELETE': {
      try {
        let deleted = false;
        await updateHighlights(message.payload.urlHash, (highlights) => {
          const filtered = highlights.filter(h => h.id !== message.payload.highlightId);
          deleted = filtered.length < highlights.length;
          return filtered;
        });
        sendResponse({ ok: true, data: { deleted } });
      } catch (err: any) {
        sendResponse({ ok: false, error: { code: 'STORAGE_FAILURE', message: err.message } });
      }
      break;
    }

    case 'HIGHLIGHT_UPDATE': {
      try {
        let updated = false;
        await updateHighlights(message.payload.urlHash, (highlights) => {
          const idx = highlights.findIndex(h => h.id === message.payload.highlightId);
          if (idx === -1) return highlights;
          
          highlights[idx] = { ...highlights[idx], ...message.payload.updates };
          updated = true;
          return [...highlights];
        });
        sendResponse({ ok: true, data: { updated } });
      } catch (err: any) {
        sendResponse({ ok: false, error: { code: 'STORAGE_FAILURE', message: err.message } });
      }
      break;
    }
  }
}

/**
 * Domain Handler: Content Scraping
 */
async function handleScrapeMessage(sendResponse: (r: any) => void) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      return sendResponse({ ok: false, error: { code: 'TAB_NOT_FOUND', message: 'No active tab found' } });
    }

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_CONTENT' });
    sendResponse(response);
  } catch (err: any) {
    console.error('[IcyCrow] Scrape failed:', err);
    sendResponse({ 
      ok: false, 
      error: { code: 'SCRAPE_FAILURE', message: err.message || 'Unknown error' } 
    });
  }
}

/**
 * Domain Handler: Articles & Knowledge
 */
async function handleArticleMessage(message: ValidatedInboundMessage, sendResponse: (r: any) => void) {
  if (message.type !== 'ARTICLE_SAVE') return;

  try {
    // 1. Scrape content
    const scrapeRes: any = await new Promise((resolve) => {
      handleScrapeMessage(resolve);
    });

    if (!scrapeRes.ok) {
      return sendResponse(scrapeRes);
    }

    const { url, title, content } = scrapeRes.data;
    const articleId = crypto.randomUUID() as any;

    const article: IDBArticle = {
      id: articleId,
      url: message.payload.url || url,
      title: message.payload.title || title,
      fullText: content,
      aiSummary: null,
      userNotes: '',
      savedAt: new Date().toISOString() as any,
      spaceId: message.payload.spaceId || null,
      encryption: { encrypted: false }
    };

    // 2. Save Article to IDB
    await saveArticle(article);

    // 3. Trigger Embedding in Offscreen
    const embedRes: any = await offscreenManager.sendToOffscreen({
      type: 'BATCH_EMBED',
      payload: { articles: [{ id: articleId, content: article.fullText || article.title }] }
    });

    if (embedRes.ok && embedRes.data.embeddings?.length > 0) {
      const { vector } = embedRes.data.embeddings[0];
      await saveEmbedding({
        articleId,
        vector: new Float32Array(vector),
        modelVersion: 1,
        createdAt: new Date().toISOString() as any
      });
    }

    sendResponse({ ok: true, data: { id: articleId, embedded: !!embedRes.ok } });
  } catch (err: any) {
    sendResponse({ ok: false, error: { code: 'ARTICLE_SAVE_FAILURE', message: err.message } });
  }
}

/**
 * Domain Handler: Crypto & Security
 */
async function handleCryptoMessage(message: ValidatedInboundMessage, sendResponse: (r: any) => void) {
  switch (message.type) {
    case 'CRYPTO_UNLOCK': {
      const unlocked = await cryptoManager.unlock(message.payload.passphrase);
      sendResponse({ ok: true, data: { unlocked, autoLockMinutes: 30 } });
      break;
    }

    case 'CRYPTO_LOCK': {
      await cryptoManager.lock();
      sendResponse({ ok: true, data: { locked: true } });
      break;
    }
  }
}

/**
 * Domain Handler: AI & Gemini Bridge
 */
async function handleAiMessage(message: ValidatedInboundMessage, sendResponse: (r: any) => void) {
  switch (message.type) {
    case 'AI_QUERY': {
      try {
        const { taskId, position } = taskQueue.enqueue(async () => {
          const result = await chrome.storage.session.get('sessionState');
          const state = (result.sessionState as SessionState) || {};
          const geminiId = state.geminiTabId;
          if (!geminiId) throw new Error('GEMINI_TAB_NOT_FOUND');

          return await chrome.tabs.sendMessage(geminiId, {
            type: 'AI_QUERY',
            payload: { prompt: message.payload.prompt }
          });
        });

        sendResponse({ ok: true, data: { taskId, position } });
      } catch (err: any) {
        sendResponse({ ok: false, error: { code: 'QUEUE_ERROR', message: err.message } });
      }
      break;
    }

    case 'AI_QUERY_STATUS': {
      sendResponse({ ok: true, data: { status: 'PENDING' } });
      break;
    }

    case 'GEMINI_HEALTH_CHECK': {
      const result = await chrome.storage.session.get('sessionState');
      const state = (result.sessionState as SessionState) || {};
      const tabId = state.geminiTabId;
      
      sendResponse({
        ok: true,
        data: {
          tabFound: !!tabId,
          selectors: GEMINI_SELECTORS
        }
      });
      break;
    }

    case 'SEMANTIC_SEARCH': {
      try {
        const stored = await getAllEmbeddings();
        if (stored.length === 0) {
          return sendResponse({ ok: true, data: { results: [] } });
        }

        const transportable = stored.map(s => ({
          ...s,
          vector: Array.from(s.vector as any)
        }));

        const searchRes: any = await offscreenManager.sendToOffscreen({
          type: 'SEMANTIC_SEARCH',
          payload: {
            query: message.payload.query,
            stored: transportable,
            topKCount: message.payload.topK
          }
        });

        sendResponse(searchRes);
      } catch (err: any) {
        sendResponse({ ok: false, error: { code: 'SEARCH_FAILURE', message: err.message } });
      }
      break;
    }

    case 'EXPORT_WORKSPACE': {
      try {
        const password = message.payload.password;
        const validation = validateExportPassword(password);
        if (validation !== true) {
          return sendResponse({ ok: false, error: { code: 'WEAK_PASSWORD', message: 'Min 8 chars, 1 digit, 1 special char' } });
        }

        // 2. Delegate to Offscreen
        const res: any = await offscreenManager.sendToOffscreen({
          type: 'EXPORT_WORKSPACE',
          payload: { password }
        });

        if (res.ok) {
          // 3. Save Manifest to IDB
          await saveBackupManifest({
            id: crypto.randomUUID() as UUID,
            timestamp: new Date().toISOString() as ISOTimestamp,
            fileSize: res.data.arrayBuffer ? res.data.arrayBuffer.byteLength : 0,
            checksum: 'SHA-256-PENDING',
            location: 'Browser Download'
          });
        }

        sendResponse(res);

      } catch (err: any) {
        sendResponse({ ok: false, error: { code: 'EXPORT_FAILURE', message: err.message } });
      }
      break;
    }

    case 'IMPORT_WORKSPACE': {
      try {
        const res = await offscreenManager.sendToOffscreen({
          type: 'IMPORT_WORKSPACE',
          payload: message.payload
        });
        sendResponse(res);
      } catch (err: any) {
        sendResponse({ ok: false, error: { code: 'IMPORT_FAILURE', message: err.message } });
      }
      break;
    }
  }
}

// Automatically boot when SW spins up
// watchGeminiTab must run immediately to catch tab events on SW wake
watchGeminiTab('https://gemini.google.com/*');

// Side Panel Activation: Open on action click
chrome.action.onClicked.addListener((tab) => {
  if (tab.windowId) {
    (chrome as any).sidePanel.open({ windowId: tab.windowId });
  }
});

boot().catch(console.error);


