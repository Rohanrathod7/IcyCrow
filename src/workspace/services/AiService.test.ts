import { describe, it, expect, vi, beforeEach } from 'vitest';
import { askAI } from './AiService';

describe('AiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock chrome APIs
    (global as any).chrome = {
      runtime: {
        sendMessage: vi.fn(),
        onMessage: {
          addListener: vi.fn(),
          removeListener: vi.fn()
        }
      }
    };

    // Mock crypto for deterministic taskId
    vi.stubGlobal('crypto', {
      randomUUID: () => '123-456'
    });
  });

  it('sends AI_QUERY message and aggregates stream response', async () => {
    const mockTaskId = '123-456';
    
    // 1. Mock first response (taskId)
    (chrome.runtime.sendMessage as any).mockImplementation((msg: any, callback: (res: any) => void) => {
      if (msg.type === 'AI_QUERY') {
        callback({ ok: true, data: { taskId: mockTaskId } });
      }
    });

    // 2. Trigger stream messages manually
    let listener: any = null;
    (chrome.runtime.onMessage.addListener as any).mockImplementation((cb: any) => {
      listener = cb;
    });

    const promise = askAI('explain', 'The quick brown fox');

    // Simulate streaming chunks
    setTimeout(() => {
      listener({ type: 'AI_RESPONSE_STREAM', payload: { taskId: mockTaskId, chunk: 'The fox ', done: false } });
      listener({ type: 'AI_RESPONSE_STREAM', payload: { taskId: mockTaskId, chunk: 'is fast.', done: true } });
    }, 10);

    const result = await promise;
    expect(result).toBe('The fox is fast.');
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'AI_QUERY' }),
      expect.any(Function)
    );
  });

  it('rejects if taskId is not returned', async () => {
    (chrome.runtime.sendMessage as any).mockImplementation((_msg: any, callback: (res: any) => void) => {
      callback({ ok: false, error: 'TAB_NOT_FOUND' });
    });

    await expect(askAI('explain', 'text')).rejects.toThrow('TAB_NOT_FOUND');
  });
});
