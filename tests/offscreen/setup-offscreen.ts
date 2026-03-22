import { vi } from 'vitest';

export const addListenerSpy = vi.fn();
export const getURLMock = vi.fn((path) => `chrome-extension://id/${path}`);

globalThis.chrome = {
  offscreen: { Reason: { LOCAL_STORAGE: 'LOCAL_STORAGE' } },
  runtime: {
    onMessage: { addListener: addListenerSpy },
    getURL: getURLMock
  }
} as any;

globalThis.fetch = vi.fn().mockResolvedValue({
  arrayBuffer: async () => new ArrayBuffer(0)
}) as any;
