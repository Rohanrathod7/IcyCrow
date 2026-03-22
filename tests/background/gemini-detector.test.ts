import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findGeminiTab } from '../../src/background/gemini-detector';

describe('Gemini Detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.chrome = {
      tabs: {
        query: vi.fn(),
      },
    } as any;
  });

  it('returns tab id if Gemini is found', async () => {
    (chrome.tabs.query as any).mockResolvedValue([{ id: 456 }]);
    const result = await findGeminiTab('https://gemini.google.com/*');
    expect(result).toBe(456);
    expect(chrome.tabs.query).toHaveBeenCalledWith({ url: 'https://gemini.google.com/*' });
  });

  it('returns null if Gemini not found', async () => {
    (chrome.tabs.query as any).mockResolvedValue([]);
    const result = await findGeminiTab('https://gemini.google.com/*');
    expect(result).toBeNull();
  });
});
