import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiManager } from './ai-manager';
import type { UUID } from '../../lib/types';

describe('AiManager: window.ai Bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock global window/globalThis.ai
    (globalThis as any).ai = {
      assistant: {
        capabilities: vi.fn(),
        create: vi.fn()
      }
    };
  });

  it('detects capabilities correctly (readily)', async () => {
    vi.mocked((globalThis as any).ai.assistant.capabilities).mockResolvedValue({
      available: 'readily'
    });

    const aiManager = new AiManager();
    const canUse = await aiManager.checkCapabilities();
    expect(canUse).toBe(true);
  });

  it('detects capabilities correctly (not-available)', async () => {
    vi.mocked((globalThis as any).ai.assistant.capabilities).mockResolvedValue({
      available: 'no'
    });

    const aiManager = new AiManager();
    const canUse = await aiManager.checkCapabilities();
    expect(canUse).toBe(false);
  });

  it('queries built-in AI and trigger stream callbacks', async () => {
    const mockSession = {
      promptStreaming: vi.fn().mockImplementation(function* () {
        yield 'Hello';
        yield ' World';
      })
    };

    vi.mocked((globalThis as any).ai.assistant.create).mockResolvedValue(mockSession);
    
    const aiManager = new AiManager();
    const taskId = 'task-1' as UUID;
    const prompt = 'Hi';
    const chunks: string[] = [];

    await aiManager.queryBuiltIn(prompt, (chunk) => chunks.push(chunk));

    expect(chunks).toEqual(['Hello', ' World']);
  });
});
