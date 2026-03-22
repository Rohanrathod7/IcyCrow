import type { ValidatedInboundMessage } from './zod-schemas';

/**
 * Type-safe interface for sending messages to the Service Worker.
 * Automatically casts the response to the generic type T.
 */
export async function sendToSW<T>(message: ValidatedInboundMessage): Promise<T> {
  return chrome.runtime.sendMessage(message) as Promise<T>;
}
