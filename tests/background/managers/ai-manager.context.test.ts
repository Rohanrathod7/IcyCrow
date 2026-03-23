import { describe, it, expect } from 'vitest';
import { AiManager } from '../../../src/background/managers/ai-manager';
import type { ChatMessage, UUID } from '../../../src/lib/types';

describe('AiManager Context Formatting', () => {
  const ai = new AiManager();

  it('should format last 10 messages into a context string', () => {
    const history: ChatMessage[] = Array.from({ length: 15 }, (_, i) => ({
      id: `msg-${i}` as UUID,
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Content ${i}`,
      timestamp: new Date().toISOString() as any,
      contextTabIds: []
    }));

    const formatted = ai.formatContext(history, 'New prompt');

    // Should include the last 10 messages (indices 5 to 14)
    expect(formatted).toContain('Content 14');
    expect(formatted).toContain('Content 5');
    expect(formatted).not.toContain('Content 4'); // Should be truncated
    expect(formatted).toContain('New prompt');
    
    // Check formatting style
    expect(formatted).toContain('User: Content 14');
    expect(formatted).toContain('Assistant: Content 13');
  });

  it('should handle empty history gracefully', () => {
    const formatted = ai.formatContext([], 'Solo prompt');
    expect(formatted).toBe('Solo prompt');
  });
});
