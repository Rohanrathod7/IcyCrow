import { DEFAULT_SETTINGS } from '@lib/constants';
import type { SessionState, Highlight } from '@lib/types';
import { InboundMessageSchema, type ValidatedInboundMessage } from '@lib/zod-schemas';
import { cryptoManager } from './crypto-manager';
import { getHighlights, updateHighlights, getChatHistory } from '@lib/storage';
import { taskQueue } from '@lib/task-queue';
import { watchGeminiTab, verifyAndRecoverBridge } from './gemini-detector';
import { GEMINI_SELECTORS } from '@lib/gemini-selectors';
import { offscreenManager } from './offscreen-manager';
import { spaceManager } from './managers/space-manager';
import { saveArticle, saveEmbedding, getAllEmbeddings, saveBackupManifest } from '@lib/idb-store';
import { validateExportPassword } from '@lib/export-worker';
import { aiManager } from './managers/ai-manager';
import { setupPdfInterceptor, registerTabPdfInterceptor } from './managers/pdf-interceptor';
import { syncManager } from './managers/sync-manager';
import type { IDBArticle, UUID, ISOTimestamp, SpaceRestoreMsg } from '@lib/types';

console.log('IcyCrow MV3 Service Worker installed.');

// Initialize background sync engine
syncManager.init().catch(err => console.error('[IcyCrow] SyncManager init failed:', err));

/**
 * Handle hotkey commands
 */
chrome.commands?.onCommand?.addListener(async (command) => {
  if (command === 'highlight-selection') {
    const [tab] = await chrome.tabs?.query({ active: true, currentWindow: true }) || [];
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'COMMAND_HIGHLIGHT' });
    }
  }
});

chrome.runtime?.onInstalled?.addListener(async (details) => {
  if (typeof chrome !== 'undefined' && (chrome as any).sidePanel?.setPanelBehavior) {
    await (chrome as any).sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .catch((err: any) => console.error('[IcyCrow] Failed to set side panel behavior on install:', err));
  }
  if (details.reason === 'install') {
    const existing = await chrome.storage?.local?.get('settings');
    let enabled = true;
    if (existing && !existing.settings) {
      await chrome.storage?.local?.set({ settings: DEFAULT_SETTINGS });
      console.log('Initialized default settings.');
    } else if (existing?.settings) {
      enabled = (existing.settings as any).enablePdfInterceptor !== false;
    }
    await setupPdfInterceptor(enabled);
  }
});

chrome.alarms?.onAlarm?.addListener((alarm) => {
  if (alarm.name === 'keepalive') {
    // No-op
  } else if (alarm.name === 'crypto-autolock') {
    cryptoManager.checkAutoLock();
  }
});

export async function boot() {
  try {
    const result = await chrome.storage?.session?.get('sessionState') || {};
    const currentState: SessionState = (result.sessionState as SessionState) || {
      swRestartCount: 0,
      cryptoKeyUnlocked: false,
      geminiTabId: null,
      geminiBridgeHealthy: false,
      lastSelectorCheckAt: null,
      cryptoKeyLastUsedAt: null,
      swBootedAt: (new Date().toISOString() as any)
    };

    const newState: SessionState = {
      ...currentState,
      swRestartCount: (currentState.swRestartCount || 0) + 1,
      cryptoKeyUnlocked: false,
      swBootedAt: (new Date().toISOString() as any)
    };

    await chrome.storage?.session?.set({ sessionState: newState });
    console.log(`[IcyCrow] SW Booted: Restart #${newState.swRestartCount}`);
    
    if (typeof chrome !== 'undefined' && (chrome as any).sidePanel?.setPanelBehavior) {
      await (chrome as any).sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
        .catch((err: any) => console.error('[IcyCrow] Failed to set side panel behavior on boot:', err));
    }
    
    chrome.alarms?.create('keepalive', { periodInMinutes: 0.4 });
    chrome.alarms?.create('crypto-autolock', { periodInMinutes: 1.0 });

    // Setup PDF Interceptor on boot
    const localData = await chrome.storage?.local?.get('settings');
    const enabled = (localData?.settings as any)?.enablePdfInterceptor !== false;
    await setupPdfInterceptor(enabled);
  } catch (err) {
    console.error('[IcyCrow] SW Boot failed:', err);
  }
}

chrome.runtime?.onMessage?.addListener((request, sender, sendResponse) => {
  // Security: Verify sender is our own extension (if sender provided)
  if (sender && sender.id !== chrome.runtime?.id) {
    console.warn('[IcyCrow] Blocked message from external sender:', sender.id);
    return false;
  }

  // Prevent background script from processing its own broadcasted messages
  // In MV3, messages from background to runtime trigger onMessage in background too.
  if (!sender || (!sender.tab && sender.url?.includes('background'))) {
    return false;
  }

  const result = InboundMessageSchema.safeParse(request);
  if (!result.success) {
    sendResponse({ ok: false, error: { code: 'VALIDATION_ERROR', message: result.error.message } });
    return false;
  }

  handleMessage(result.data, sendResponse, sender);
  return true; 
});

export async function handleMessage(
  message: ValidatedInboundMessage,
  sendResponse: (response: any) => void,
  sender?: chrome.runtime.MessageSender
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
      case 'EXPORT_WORKSPACE':
      case 'IMPORT_WORKSPACE':
      case 'SEMANTIC_SEARCH':
      case 'WINDOW_AI_QUERY':
      case 'AI_RESPONSE_STREAM':
      case 'EXPLAIN_TEXT_REQUEST':
      case 'AI_INFER_CATEGORY':
      case 'MANUAL_REGISTER_BRIDGE':
        return await handleAiMessage(message, sendResponse, sender);

      case 'SPACE_CREATE':
      case 'SPACE_RESTORE':
      case 'SPACE_DELETE':
      case 'SPACE_SYNC_MANUAL_REQUEST':
      case 'SPACE_ADD_ACTIVE_TAB':
      case 'TAB_ADD_STANDALONE':
      case 'TAB_ADD_MULTIPLE_STANDALONE':
      case 'TAB_DELETE_STANDALONE':
      case 'TAB_MOVE_TO_SPACE':
        return await handleSpaceMessage(message, sendResponse);

      default:
        sendResponse({ ok: false, error: { code: 'NOT_IMPLEMENTED', message: `Handler for ${(message as any).type} not yet implemented` } });
    }
  } catch (err: any) {
    sendResponse({ ok: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Unknown error' } });
  }
}

async function handleHighlightMessage(message: ValidatedInboundMessage, sendResponse: (r: any) => void) {
  switch (message.type) {
    case 'HIGHLIGHT_CREATE': {
      const hId = crypto.randomUUID();
      const createdAt = new Date().toISOString() as any;
      try {
        let alreadyExists = false;
        let existingData: { id: string, createdAt: string } | null = null;
        await updateHighlights(message.payload.urlHash, (highlights) => {
          const existing = highlights.find(h => h.anchor.exact === message.payload.anchor.exact && h.url === message.payload.url);
          if (existing) {
            alreadyExists = true;
            existingData = { id: existing.id, createdAt: existing.createdAt };
            return highlights;
          }
          const newHighlight: Highlight = { ...message.payload, id: hId as any, createdAt, note: null };
          return [...highlights, newHighlight];
        });
        if (alreadyExists && existingData) sendResponse({ ok: true, data: existingData });
        else sendResponse({ ok: true, data: { id: hId, createdAt } });
      } catch (err: any) {
        sendResponse({ ok: false, error: { code: 'STORAGE_FAILURE', message: err.message || 'Quota exceeded' } });
      }
      break;
    }
    case 'HIGHLIGHTS_FETCH': {
      const highlights = await getHighlights(message.payload.urlHash);
      const pageChanged = highlights.length > 0 && highlights[0].pageMeta.domFingerprint !== message.payload.currentDomFingerprint;
      sendResponse({ ok: true, data: { highlights, pageChanged } });
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

async function handleScrapeMessage(sendResponse: (r: any) => void) {
  try {
    const [tab] = await chrome.tabs?.query({ active: true, currentWindow: true }) || [];
    if (!tab || !tab.id) return sendResponse({ ok: false, error: { code: 'TAB_NOT_FOUND', message: 'No active tab found' } });
    const response = await chrome.tabs?.sendMessage(tab.id, { type: 'SCRAPE_CONTENT' });
    sendResponse(response);
  } catch (err: any) {
    sendResponse({ ok: false, error: { code: 'SCRAPE_FAILURE', message: err.message || 'Unknown error' } });
  }
}

async function handleArticleMessage(message: ValidatedInboundMessage, sendResponse: (r: any) => void) {
  if (message.type !== 'ARTICLE_SAVE') return;
  try {
    const scrapeRes: any = await new Promise((resolve) => handleScrapeMessage(resolve));
    if (!scrapeRes.ok) return sendResponse(scrapeRes);
    const { url, title, content } = scrapeRes.data;
    const articleId = crypto.randomUUID() as any;
    const article: IDBArticle = {
      id: articleId,
      url: message.payload.url || url,
      title: message.payload.title || title,
      fullText: content,
      aiSummary: null,
      userNotes: '',
      savedAt: (new Date().toISOString() as any),
      spaceId: message.payload.spaceId || null,
      encryption: { encrypted: false }
    };
    await saveArticle(article);
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
        createdAt: (new Date().toISOString() as any)
      });
    }
    sendResponse({ ok: true, data: { id: articleId, embedded: !!embedRes.ok } });
  } catch (err: any) {
    sendResponse({ ok: false, error: { code: 'ARTICLE_SAVE_FAILURE', message: err.message } });
  }
}

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

async function handleAiMessage(
  message: ValidatedInboundMessage, 
  sendResponse: (r: any) => void,
  sender?: chrome.runtime.MessageSender
) {
  switch (message.type) {
    case 'AI_QUERY': {
      try {
        const { taskId, prompt } = message.payload;
        
        // 1. Nano-First Strategy: Use local built-in AI if available
        const isNanoReady = await aiManager.checkCapabilities();
        if (isNanoReady) {
          console.log('[IcyCrow] Using high-performance Nano path for query:', taskId);
          
          // Execute in background without focusing any tabs
          aiManager.queryBuiltIn(prompt, (chunk) => {
            chrome.runtime.sendMessage({
              type: 'AI_RESPONSE_STREAM',
              payload: { taskId, chunk, done: false }
            });
          }).then(() => {
            chrome.runtime.sendMessage({
              type: 'AI_RESPONSE_STREAM',
              payload: { taskId, chunk: '', done: true }
            });
          }).catch((err) => {
            chrome.runtime.sendMessage({
              type: 'AI_RESPONSE_STREAM',
              payload: { taskId, chunk: '', done: true, error: err.message }
            });
          });
          
          sendResponse({ ok: true, data: { taskId, engine: 'nano' } });
          return;
        }

        // 2. Fallback: Gemini Tab Bridge (Requires Focusing)
        const result = await chrome.storage?.session?.get('sessionState');
        const state = (result?.sessionState as SessionState) || {};
        
        let geminiIds = state.geminiTabIds || [];
        if (state.manualGeminiTabId) {
          geminiIds = [state.manualGeminiTabId, ...geminiIds.filter(id => id !== state.manualGeminiTabId)];
        }
        
        const { position } = taskQueue.enqueue(async () => {
          try {
            if (geminiIds.length === 0) throw new Error('GEMINI_TAB_NOT_FOUND: Built-in AI is unavailable and no Gemini tabs are open.');
            

            for (const tabId of geminiIds) {
              try {
                const tab = await chrome.tabs.get(tabId);
                
                // Synchronous Wakeup Protocol (Focus only for Bridge)
                const [currentView] = await chrome.tabs.query({ active: true, currentWindow: true });
                const currentWindow = await chrome.windows.getLastFocused().catch(() => null);

                // Focus target window and make tab active
                await chrome.windows.update(tab.windowId, { focused: true }).catch(() => null);
                await chrome.tabs.update(tabId, { active: true });
                
                chrome.runtime.sendMessage({
                  type: 'AI_RESPONSE_STREAM', 
                  payload: { taskId, chunk: '', done: false, tabInfo: { title: tab.title, url: tab.url, id: tabId } }
                });
                
                const bridgeResponse = await Promise.race([
                  chrome.tabs.sendMessage(tabId, { type: 'AI_QUERY', payload: { prompt, taskId } }),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('BRIDGE_TIMEOUT')), 15000))
                ]);
                
                // Restore focus immediately
                if (currentWindow?.id) {
                  await chrome.windows.update(currentWindow.id, { focused: true }).catch(() => null);
                }
                if (currentView?.id && currentView.id !== tabId) {
                  await chrome.tabs.update(currentView.id, { active: true });
                }
                
                return bridgeResponse;
              } catch (err: any) {
                console.warn(`[IcyCrow] Fallback Bridge failed for tab ${tabId}:`, err.message);

                continue;
              }
            }
            throw new Error('BRIDGE_OFFLINE: Built-in AI is unavailable. Please refresh your Gemini tab.');
          } catch (err: any) {
            chrome.runtime.sendMessage({
              type: 'AI_RESPONSE_STREAM',
              payload: { taskId, chunk: '', done: true, error: err.message }
            });
            throw err;
          }
        });
        
        sendResponse({ ok: true, data: { taskId, position, engine: 'bridge' } });
      } catch (err: any) {
        sendResponse({ ok: false, error: { code: 'ROUTING_ERROR', message: err.message } });
      }
      break;
    }
    case 'AI_QUERY_STATUS': {
      sendResponse({ ok: true, data: { status: 'PENDING' } });
      break;
    }
    case 'GEMINI_HEALTH_CHECK': {
      const result = await chrome.storage?.session?.get('sessionState');
      const state = (result?.sessionState as SessionState) || {};
      
      let tabId = state.manualGeminiTabId || null;
      if (!tabId || !(state.geminiTabIds || []).includes(tabId)) {
        tabId = (state.geminiTabIds && state.geminiTabIds[0]) || null;
      }

      let healthy = false;
      let tabInfo = null;

      if (tabId) {
        try {
          const tab = await chrome.tabs.get(tabId);
          tabInfo = {
            id: tab.id,
            title: tab.title || 'Google Gemini',
            url: tab.url || 'https://gemini.google.com'
          };
          healthy = await verifyAndRecoverBridge(tabId);
        } catch (e) {
          console.warn('[IcyCrow] Health check verification failed:', e);
        }
      }

      sendResponse({ 
        ok: true, 
        data: { 
          tabFound: !!tabId,
          healthy,
          manualGeminiTabId: state.manualGeminiTabId || null,
          tabInfo,
          selectors: GEMINI_SELECTORS
        } 
      });
      break;
    }
    case 'SEMANTIC_SEARCH': {
      try {
        const stored = await getAllEmbeddings();
        if (stored.length === 0) return sendResponse({ ok: true, data: { results: [] } });
        const searchRes: any = await offscreenManager.sendToOffscreen({
          type: 'SEMANTIC_SEARCH',
          payload: { query: message.payload.query, stored: stored.map(s => ({ ...s, vector: Array.from(s.vector as any) })), topKCount: message.payload.topK }
        });
        sendResponse(searchRes);
      } catch (err: any) {
        sendResponse({ ok: false, error: { code: 'SEARCH_FAILURE', message: err.message } });
      }
      break;
    }
    case 'WINDOW_AI_QUERY': {
      try {
        const { prompt, taskId, spaceId } = message.payload;
        const history = await getChatHistory(spaceId);
        const contextualPrompt = aiManager.formatContext(history, prompt);

        // Run async without blocking the main SW loop
        aiManager.queryBuiltIn(contextualPrompt, (chunk) => {
          chrome.runtime.sendMessage({
            type: 'AI_RESPONSE_STREAM',
            payload: { taskId, chunk, done: false }
          });
        }).then(() => {
          chrome.runtime.sendMessage({ type: 'AI_RESPONSE_STREAM', payload: { taskId, chunk: '', done: true } });
        }).catch((err) => {
          chrome.runtime.sendMessage({ type: 'AI_RESPONSE_STREAM', payload: { taskId, chunk: '', done: true, error: err.message } });
        });

        sendResponse({ ok: true, data: { status: 'started' } });
      } catch (err: any) {
        sendResponse({ ok: false, error: { code: 'WINDOW_AI_ERROR', message: err.message } });
      }
      break;
    }
    case 'EXPORT_WORKSPACE': {
      try {
        const password = message.payload.password;
        const validation = validateExportPassword(password);
        if (validation !== true) return sendResponse({ ok: false, error: { code: 'WEAK_PASSWORD', message: 'Min 8 chars, 1 digit, 1 special char' } });
        const res: any = await offscreenManager.sendToOffscreen({ type: 'EXPORT_WORKSPACE', payload: { password } });
        if (res.ok) {
          await saveBackupManifest({
            id: (crypto.randomUUID() as UUID),
            timestamp: (new Date().toISOString() as ISOTimestamp),
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
        const res = await offscreenManager.sendToOffscreen({ type: 'IMPORT_WORKSPACE', payload: message.payload });
        sendResponse(res);
      } catch (err: any) {
        sendResponse({ ok: false, error: { code: 'IMPORT_FAILURE', message: err.message } });
      }
      break;
    }
    case 'MANUAL_REGISTER_BRIDGE': {
      try {
        const { tabId } = message.payload;

        // 1. Fetch and validate URL
        const tab = await chrome.tabs.get(tabId);
        if (!tab.url || !tab.url.startsWith('https://gemini.google.com/')) {
          sendResponse({
            ok: false,
            error: {
              code: 'INVALID_URL',
              message: 'Target tab must be on https://gemini.google.com/'
            }
          });
          break;
        }

        // 2. Health check & recovery injection
        const healthy = await verifyAndRecoverBridge(tabId);
        if (!healthy) {
          sendResponse({
            ok: false,
            error: {
              code: 'HANDSHAKE_FAILED',
              message: 'Failed to verify active handshake with Gemini tab content script.'
            }
          });
          break;
        }

        // 3. Register manual ID
        const result = await chrome.storage.session.get('sessionState');
        const state = result.sessionState || {};
        await chrome.storage.session.set({
          sessionState: {
            ...state,
            manualGeminiTabId: tabId,
            geminiTabId: tabId
          }
        });

        sendResponse({ ok: true });
      } catch (err: any) {
        sendResponse({ ok: false, error: { code: 'REGISTRATION_FAILURE', message: err.message } });
      }
      break;
    }
    case 'AI_RESPONSE_STREAM': {
      try {
        const { taskId, chunk } = message.payload || {};
        if (taskId && taskId.startsWith('telemetry')) {
          console.log(`[IcyCrow Telemetry] ${chunk}`);
        } else {
          chrome.runtime.sendMessage(message);
        }
        sendResponse({ ok: true });
      } catch (err: any) {
        sendResponse({ ok: false, error: { code: 'FORWARD_FAILURE', message: err.message } });
      }
      break;
    }
    case 'EXPLAIN_TEXT_REQUEST': {
      try {
        const { text, action, spaceId, pdfTitle, requestId } = message.payload;
        
        // [BUFFERING]: Store for the side panel to consume on mount
        await chrome.storage.session.set({ pendingPrompt: { text, action, spaceId, pdfTitle, requestId } });
        
        // [ERROR HANDLING]: Protected side panel open
        if (sender?.tab?.windowId) {
          try {
            await (chrome as any).sidePanel.open({ windowId: sender.tab.windowId });
          } catch (e) {
            console.error('[IcyCrow] Failed to auto-open side panel:', e);
          }
        }
        
        // Broadcast to existing side panels
        chrome.runtime.sendMessage(message);
        
        sendResponse({ ok: true });
      } catch (err: any) {
        sendResponse({ ok: false, error: { code: 'BRIDGE_ERROR', message: err.message } });
      }
      break;
    }
    case 'AI_INFER_CATEGORY': {
      try {
        const { titles } = message.payload;
        if (!titles || titles.length === 0) {
          return sendResponse({ ok: true, data: { category: null } });
        }
        
        const prompt = `Categorize the following browser tab titles into a single short 1-3 word category name. Return ONLY the category name. Titles: ${titles.join(', ')}`;
        
        const isNanoReady = await aiManager.checkCapabilities();
        if (isNanoReady) {
          const result = await aiManager.queryBuiltIn(prompt, () => {});
          return sendResponse({ ok: true, data: { category: result.trim().replace(/^["']|["']$/g, '') } });
        }

        const stateResult = await chrome.storage?.session?.get('sessionState');
        const state = (stateResult?.sessionState as SessionState) || {};
        let geminiIds = state.geminiTabIds || [];
        if (state.manualGeminiTabId) {
          geminiIds = [state.manualGeminiTabId, ...geminiIds.filter(id => id !== state.manualGeminiTabId)];
        }

        if (geminiIds.length === 0) {
           return sendResponse({ ok: false, error: { code: 'NO_AI', message: 'No AI available' } });
        }
        
        const taskId = crypto.randomUUID();
        
        // Wait for the bridge to finish streaming the response
        const bridgeResult = await new Promise<string>((resolve, reject) => {
          const timeout = setTimeout(() => {
            chrome.runtime.onMessage.removeListener(listener);
            reject(new Error('BRIDGE_TIMEOUT'));
          }, 15000);

          const listener = (msg: any) => {
            if (msg.type === 'AI_RESPONSE_STREAM' && msg.payload.taskId === taskId) {
              if (msg.payload.done) {
                clearTimeout(timeout);
                chrome.runtime.onMessage.removeListener(listener);
                resolve(msg.payload.chunk || '');
              } else if (msg.payload.error) {
                clearTimeout(timeout);
                chrome.runtime.onMessage.removeListener(listener);
                reject(new Error(msg.payload.error));
              }
            }
          };
          chrome.runtime.onMessage.addListener(listener);

          chrome.tabs.sendMessage(geminiIds[0], { type: 'AI_QUERY', payload: { prompt, taskId } })
            .catch(err => {
              clearTimeout(timeout);
              chrome.runtime.onMessage.removeListener(listener);
              reject(err);
            });
        });

        sendResponse({ ok: true, data: { category: bridgeResult.trim().replace(/^["']|["']$/g, '') } });
      } catch (err: any) {
        sendResponse({ ok: false, error: { code: 'INFER_ERROR', message: err.message } });
      }
      break;
    }
  }
}


async function handleSpaceMessage(message: ValidatedInboundMessage, sendResponse: (r: any) => void) {
  switch (message.type) {
    case 'SPACE_CREATE': {
      const { name, color, captureCurrentTabs, createTabGroup, tabs } = message.payload;
      const space = await spaceManager.createSpace(name, color, captureCurrentTabs, createTabGroup, tabs);
      sendResponse({ ok: true, data: { space } });
      break;
    }
    case 'SPACE_RESTORE': {
      const msg = message as SpaceRestoreMsg;
      const tabsOpened = await spaceManager.restoreSpace(msg.payload.spaceId, !!msg.payload.createNativeGroup);
      sendResponse({ ok: true, data: { tabsOpened } });
      break;
    }
    case 'SPACE_DELETE': {
      const deleted = await spaceManager.deleteSpace(message.payload.spaceId);
      sendResponse({ ok: true, data: { deleted } });
      break;
    }
    case 'SPACE_UPDATE': {
      const updated = await spaceManager.updateSpace(message.payload.spaceId, message.payload.updates);
      sendResponse({ ok: true, data: { updated } });
      break;
    }
    case 'SPACE_SYNC_MANUAL_REQUEST': {
      const synced = await spaceManager.syncManualSnapshot(message.payload.spaceId);
      sendResponse({ ok: true, data: { synced } });
      break;
    }
    case 'SPACE_ADD_ACTIVE_TAB': {
      const result = await spaceManager.addActiveTabToSpace(message.payload.spaceId);
      sendResponse({ ok: true, data: result });
      break;
    }
    case 'TAB_ADD_STANDALONE': {
      const result = await spaceManager.addActiveTabStandalone();
      sendResponse({ ok: true, data: result });
      break;
    }
    case 'TAB_ADD_MULTIPLE_STANDALONE': {
      const result = await spaceManager.addMultipleTabsStandalone(message.payload.tabs);
      sendResponse({ ok: true, data: result });
      break;
    }
    case 'TAB_DELETE_STANDALONE': {
      const deleted = await spaceManager.deleteStandaloneTab(message.payload.tabId);
      sendResponse({ ok: true, data: { deleted } });
      break;
    }
    case 'TAB_MOVE_TO_SPACE': {
      const moved = await spaceManager.moveTabToSpace(message.payload.tabId, message.payload.spaceId);
      sendResponse({ ok: true, data: { moved } });
      break;
    }
  }
}

watchGeminiTab('https://gemini.google.com/*');

chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === 'local' && changes.settings) {
    const oldVal = changes.settings.oldValue as any;
    const newVal = changes.settings.newValue as any;
    if (newVal && oldVal?.enablePdfInterceptor !== newVal.enablePdfInterceptor) {
      await setupPdfInterceptor(newVal.enablePdfInterceptor !== false);
    }
  }
});

registerTabPdfInterceptor();
boot().catch(console.error);

