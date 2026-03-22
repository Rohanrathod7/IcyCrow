import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sendToSW } from '../../src/lib/messaging';

describe('Messaging Bridge', () => {
  beforeEach(() => {
    global.chrome = {
      runtime: {
        sendMessage: vi.fn(),
      },
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call chrome.runtime.sendMessage with the correct payload', async () => {
    const mockMessage = { type: 'GEMINI_HEALTH_CHECK' } as any;
    (chrome.runtime.sendMessage as any).mockResolvedValue({ ok: true });

    const result = await sendToSW(mockMessage);

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(mockMessage);
    expect(result).toEqual({ ok: true });
  });

  it('should propagate errors from chrome.runtime.sendMessage', async () => {
    const mockMessage = { type: 'GEMINI_HEALTH_CHECK' } as any;
    (chrome.runtime.sendMessage as any).mockRejectedValue(new Error('SW_DISCONNECTED'));

    await expect(sendToSW(mockMessage)).rejects.toThrow('SW_DISCONNECTED');
  });
});
