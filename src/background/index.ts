import { DEFAULT_SETTINGS } from '@lib/constants';
import type { SessionState, Highlight } from '@lib/types';
import { InboundMessageSchema, type ValidatedInboundMessage } from '@lib/zod-schemas';
import { cryptoManager } from './crypto-manager';
import { getHighlights, setHighlights, updateHighlights } from '@lib/storage';

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

// Automatically boot when SW spins up
boot().catch(console.error);
