import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupPdfInterceptor } from '../../../src/background/managers/pdf-interceptor';

// Mock chrome.declarativeNetRequest
global.chrome = {
  declarativeNetRequest: {
    updateDynamicRules: vi.fn().mockResolvedValue(undefined),
  },
  runtime: {
    getURL: vi.fn((path) => `chrome-extension://mock-id/${path}`),
  },
} as any;

describe('PdfInterceptor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should register a dynamic redirect rule for PDFs', async () => {
    await setupPdfInterceptor();

    expect(chrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledWith({
      removeRuleIds: [1],
      addRules: [
        {
          id: 1,
          priority: 1,
          action: {
            type: 'redirect',
            redirect: {
              regexSubstitution: 'chrome-extension://mock-id/workspace/index.html?file=\\1',
            },
          },
          condition: {
            regexFilter: '^(https?://.*\\.pdf(?:\\?.*)?)$',
            resourceTypes: ['main_frame'],
          },
        },
      ],
    });
  });
});
