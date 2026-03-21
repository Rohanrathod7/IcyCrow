import { DEFAULT_SETTINGS } from '@lib/constants';
import type { SessionState } from '@lib/types';
import { InboundMessageSchema, type ValidatedInboundMessage } from '@lib/zod-schemas';
import { cryptoManager } from './crypto-manager';

console.log('IcyCrow MV3 Service Worker installed.');

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

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
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

async function handleMessage(
  message: ValidatedInboundMessage,
  sendResponse: (response: any) => void
) {
  try {
    switch (message.type) {
      case 'HIGHLIGHTS_FETCH':
        sendResponse({
          ok: true,
          data: { highlights: [], pageChanged: false }
        });
        break;
      
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

// Automatically boot when SW spins up
boot().catch(console.error);
