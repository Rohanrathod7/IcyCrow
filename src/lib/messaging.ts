import type { ValidatedInboundMessage } from './zod-schemas';

/**
 * Type-safe interface for sending messages to the Service Worker.
 * Automatically injects required metadata and casts the response.
 */
export async function sendToSW<T>(message: Omit<ValidatedInboundMessage, '_meta'>): Promise<{ ok: boolean; data?: T; error?: any }> {
  const messageWithMeta = {
    ...message,
    _meta: {
      senderId: 'side-panel',
      timestamp: new Date().toISOString(),
    },
  };
  return chrome.runtime.sendMessage(messageWithMeta);
}
